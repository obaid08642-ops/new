import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { PharmacyOrderState as GovernedPharmacyOrderState } from '@nabd/shared-contracts';
import { assertGovernedPharmacyTransition } from '../../../common/governed-workflow';
import { PharmacyOrderState } from '../schemas/pharmacy.schema';

export type PharmacyExpiryCursor = { offer_after?: string; broadcast_after?: string };

export type PharmacyExpiryResult = {
  run_id: string;
  acquired: boolean;
  skipped?: 'concurrent_run';
  offers_expired: number;
  broadcasts_closed: number;
  broadcasts_auto_cancelled: number;
  selection_claims_recovered: number;
  next_cursor: PharmacyExpiryCursor;
};

const LEASE_KEY = 'pharmacy-offer-expiry-v1';
const MAX_LIMIT = 200;
const LEASE_MS = 55_000;

/**
 * A passive, bounded domain command. A future VPS scheduler or durable worker may
 * call this method, but neither is registered here. The command only persists
 * state/audit/outbox records; it never sends notifications, refunds, cancels a
 * payment, restores stock, or starts fulfillment.
 */
@Injectable()
export class PharmacyExpiryService {
  constructor(
    @InjectModel('PharmacyOffer') private readonly offers: Model<any>,
    @InjectModel('PharmacyBroadcast') private readonly broadcasts: Model<any>,
    @InjectModel('PharmacyOrder') private readonly orders: Model<any>,
    @InjectModel('PharmacyExpiryAudit') private readonly audits: Model<any>,
    @InjectModel('PharmacyLifecycleOutbox') private readonly outbox: Model<any>,
    @InjectModel('PharmacyExpiryLease') private readonly leases: Model<any>,
  ) {}

  async expireDuePharmacyOffers(now: Date, cursor: PharmacyExpiryCursor = {}, limit = 100): Promise<PharmacyExpiryResult> {
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new Error('invalid_expiry_now');
    const boundedLimit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
    const runId = uuidv4();
    const acquired = await this.acquireLease(runId, now);
    if (!acquired) return { run_id: runId, acquired: false, skipped: 'concurrent_run', offers_expired: 0, broadcasts_closed: 0, broadcasts_auto_cancelled: 0, selection_claims_recovered: 0, next_cursor: cursor };

    const nextCursor: PharmacyExpiryCursor = { ...cursor };
    let offersExpired = 0;
    let broadcastsClosed = 0;
    let broadcastsAutoCancelled = 0;
    let selectionClaimsRecovered = 0;
    try {
      selectionClaimsRecovered = await this.recoverExpiredSelectionClaims(now, boundedLimit);
      await this.reconcilePendingArtifacts(now, runId, boundedLimit, nextCursor);

      const offerQuery: Record<string, unknown> = { status: 'open', expires_at: { $lte: now } };
      if (cursor.offer_after) offerQuery.id = { $gt: cursor.offer_after };
      const dueOffers: any[] = await this.offers.find(offerQuery).sort({ id: 1 }).limit(boundedLimit).lean();
      for (const offer of dueOffers) {
        nextCursor.offer_after = offer.id;
        const eventVersion = Number(offer.expiry_version ?? 0) + 1;
        const expired = await this.offers.findOneAndUpdate(
          { id: offer.id, status: 'open', expires_at: { $lte: now }, expiry_version: Number(offer.expiry_version ?? 1) },
          { $set: { status: 'expired', expired_at: now, expiry_reason: 'offer_ttl_elapsed', expiry_version: eventVersion, expiry_artifacts_pending: true }, $push: { timeline: { ts: now, event: 'offer_expired', meta: { reason: 'offer_ttl_elapsed', event_version: eventVersion } } } },
          { new: true },
        );
        if (!expired) continue; // selection or another invocation won; never undo that winner.
        offersExpired += 1;
        await this.persistArtifacts('offer', expired, runId, now, nextCursor, 'open', 'expired', 'offer_ttl_elapsed');
      }

      const remaining = Math.max(0, boundedLimit - dueOffers.length);
      if (remaining > 0) {
        const broadcastQuery: Record<string, unknown> = { lock_state: 'open', expires_at: { $lte: now } };
        if (cursor.broadcast_after) broadcastQuery.id = { $gt: cursor.broadcast_after };
        const dueBroadcasts: any[] = await this.broadcasts.find(broadcastQuery).sort({ id: 1 }).limit(remaining).lean();
        for (const broadcast of dueBroadcasts) {
          nextCursor.broadcast_after = broadcast.id;
          const order: any = await this.orders.findOne({ id: broadcast.order_id }).lean();
          if (!order || order.selected_offer_id || ![GovernedPharmacyOrderState.ORDER_BROADCASTING, GovernedPharmacyOrderState.OFFERS_READY].includes(order.governed_state)) continue;

          let orderAutoCancelled = false;
          if (order.governed_state === GovernedPharmacyOrderState.ORDER_BROADCASTING) {
            assertGovernedPharmacyTransition(GovernedPharmacyOrderState.ORDER_BROADCASTING, GovernedPharmacyOrderState.AUTO_CANCELLED, 'SYSTEM', { reason: 'broadcast_ttl_elapsed' });
            const cancelled: any = await this.orders.findOneAndUpdate(
              { id: order.id, selected_offer_id: { $exists: false }, governed_state: GovernedPharmacyOrderState.ORDER_BROADCASTING },
              { $set: { governed_state: GovernedPharmacyOrderState.AUTO_CANCELLED, status: PharmacyOrderState.CANCELLED }, $push: { timeline: { ts: now, event: 'broadcast_expired_without_offers', meta: { reason: 'broadcast_ttl_elapsed' } } } },
              { new: true },
            );
            if (!cancelled) continue;
            orderAutoCancelled = true;
          }

          const eventVersion = Number(broadcast.expiry_version ?? 0) + 1;
          const closed = await this.broadcasts.findOneAndUpdate(
            { id: broadcast.id, lock_state: 'open', expires_at: { $lte: now }, expiry_version: Number(broadcast.expiry_version ?? 1) },
            { $set: { lock_state: 'closed', closed_at: now, expiry_reason: 'broadcast_ttl_elapsed', expiry_version: eventVersion, expiry_artifacts_pending: true }, $push: { timeline: { ts: now, event: 'broadcast_expired', meta: { reason: 'broadcast_ttl_elapsed', event_version: eventVersion } } } },
            { new: true },
          );
          if (!closed) continue;
          broadcastsClosed += 1;
          if (orderAutoCancelled) broadcastsAutoCancelled += 1;
          await this.persistArtifacts('broadcast', closed, runId, now, nextCursor, 'open', 'closed', 'broadcast_ttl_elapsed');
        }
      }
      return { run_id: runId, acquired: true, offers_expired: offersExpired, broadcasts_closed: broadcastsClosed, broadcasts_auto_cancelled: broadcastsAutoCancelled, selection_claims_recovered: selectionClaimsRecovered, next_cursor: nextCursor };
    } finally {
      await this.leases.updateOne({ lease_key: LEASE_KEY, owner_token: runId }, { $set: { expires_at: now, released_at: now } });
    }
  }

  private async acquireLease(runId: string, now: Date): Promise<boolean> {
    try {
      const lease: any = await this.leases.findOneAndUpdate(
        { lease_key: LEASE_KEY, $or: [{ expires_at: { $lte: now } }, { owner_token: runId }] },
        { $set: { owner_token: runId, expires_at: new Date(now.getTime() + LEASE_MS), released_at: undefined }, $setOnInsert: { lease_key: LEASE_KEY, version: 1 } },
        { new: true, upsert: true },
      );
      return lease?.owner_token === runId;
    } catch (error: any) {
      if (error?.code === 11000) return false;
      throw error;
    }
  }

  private async recoverExpiredSelectionClaims(now: Date, limit: number): Promise<number> {
    const stuck: any[] = await this.offers.find({ status: 'selection_pending', selection_lock_until: { $lte: now } }).sort({ id: 1 }).limit(limit).lean();
    let recovered = 0;
    for (const offer of stuck) {
      const order: any = await this.orders.findOne({ id: offer.order_id }).lean();
      if (order?.selected_offer_id) continue; // selected/paying/insured orders remain untouched.
      const nextStatus = offer.expires_at <= now ? 'expired' : 'open';
      const eventVersion = Number(offer.expiry_version ?? 0) + (nextStatus === 'expired' ? 1 : 0);
      const claimed = await this.offers.findOneAndUpdate(
        { id: offer.id, status: 'selection_pending', selection_lock_until: { $lte: now } },
        { $set: { status: nextStatus, selection_lock_until: undefined, ...(nextStatus === 'expired' ? { expired_at: now, expiry_reason: 'selection_claim_expired', expiry_version: eventVersion, expiry_artifacts_pending: true } : {}) }, $push: { timeline: { ts: now, event: nextStatus === 'expired' ? 'offer_expired_after_selection_claim' : 'selection_claim_recovered', meta: { reason: nextStatus === 'expired' ? 'selection_claim_expired' : 'selection_claim_recovered' } } } },
        { new: true },
      );
      if (!claimed) continue;
      recovered += 1;
      if (nextStatus === 'expired') await this.persistArtifacts('offer', claimed, 'recovery', now, {}, 'selection_pending', 'expired', 'selection_claim_expired');
    }
    return recovered;
  }

  private async reconcilePendingArtifacts(now: Date, runId: string, limit: number, cursor: PharmacyExpiryCursor): Promise<void> {
    const pendingOffers: any[] = await this.offers.find({ status: 'expired', expiry_artifacts_pending: true }).sort({ id: 1 }).limit(limit).lean();
    for (const offer of pendingOffers) await this.persistArtifacts('offer', offer, runId, now, cursor, 'open', 'expired', offer.expiry_reason ?? 'offer_ttl_elapsed');
    const remaining = Math.max(0, limit - pendingOffers.length);
    if (!remaining) return;
    const pendingBroadcasts: any[] = await this.broadcasts.find({ lock_state: 'closed', expiry_artifacts_pending: true }).sort({ id: 1 }).limit(remaining).lean();
    for (const broadcast of pendingBroadcasts) await this.persistArtifacts('broadcast', broadcast, runId, now, cursor, 'open', 'closed', broadcast.expiry_reason ?? 'broadcast_ttl_elapsed');
  }

  private async persistArtifacts(entityType: 'offer' | 'broadcast', entity: any, runId: string, now: Date, cursor: PharmacyExpiryCursor, stateBefore: string, stateAfter: string, reason: string): Promise<void> {
    const version = Number(entity.expiry_version);
    const dedupeKey = `pharmacy-expiry:${entityType}:${entity.id}:v${version}`;
    await this.audits.updateOne(
      { entity_type: entityType, entity_id: entity.id, event_version: version },
      { $setOnInsert: { id: uuidv4(), run_id: runId, entity_type: entityType, entity_id: entity.id, order_id: entity.order_id, event_version: version, reason, occurred_at: now, state_before: stateBefore, state_after: stateAfter, cursor } },
      { upsert: true },
    );
    await this.outbox.updateOne(
      { dedupe_key: dedupeKey },
      { $setOnInsert: { id: uuidv4(), dedupe_key: dedupeKey, event_type: `pharmacy.${entityType}.expired`, aggregate_type: entityType, aggregate_id: entity.id, order_id: entity.order_id, event_version: version, payload: { reason, occurred_at: now.toISOString(), state_before: stateBefore, state_after: stateAfter }, status: 'pending', available_at: now } },
      { upsert: true },
    );
    const model = entityType === 'offer' ? this.offers : this.broadcasts;
    await model.updateOne({ id: entity.id, expiry_version: version, expiry_artifacts_pending: true }, { $set: { expiry_artifacts_pending: false } });
  }
}
