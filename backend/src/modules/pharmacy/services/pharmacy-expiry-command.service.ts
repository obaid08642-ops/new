import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { PharmacyOrderState } from '../schemas/pharmacy.schema';
import { PharmacyBroadcastService } from './pharmacy-broadcast.service';

const LEASE_MS = 60_000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type ExpiryCursor = { offer_id?: string; broadcast_id?: string };
type CommandResult = {
  now: Date;
  scanned_offers: number;
  expired_offers: number;
  scanned_broadcasts: number;
  advanced_rounds: number;
  closed_broadcasts: number;
  recipient_intents: number;
  skipped_claimed: number;
  next_cursor: ExpiryCursor | null;
};

/**
 * Explicit bounded command. It has no scheduler decoration and no caller in app
 * startup. The caller must first apply the reviewed index migration in an isolated
 * environment; this command only stores durable state and pending intents.
 */
@Injectable()
export class PharmacyExpiryCommandService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel('PharmacyOffer') private readonly offers: Model<any>,
    @InjectModel('PharmacyBroadcast') private readonly broadcasts: Model<any>,
    @InjectModel('PharmacyOrder') private readonly orders: Model<any>,
    private readonly broadcastService: PharmacyBroadcastService,
  ) {}

  private limit(value?: number) {
    const parsed = Number(value ?? DEFAULT_LIMIT);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) throw new BadRequestException(`expiry_limit_must_be_integer_1_to_${MAX_LIMIT}`);
    return parsed;
  }

  private modified(result: any) { return Number(result?.modifiedCount ?? result?.nModified ?? result?.n ?? 0) === 1; }

  private claimFilter(id: string, dueField: string, now: Date) {
    return { id, [dueField]: { $lte: now }, $or: [{ expiry_claim: { $exists: false } }, { 'expiry_claim.lease_expires_at': { $lte: now } }] };
  }

  private async withTransaction(work: (session: any) => Promise<void>) {
    const session = await this.connection.startSession();
    try { await session.withTransaction(async () => work(session)); }
    finally { await session.endSession(); }
  }

  private async upsertOutbox(event: { type: string; aggregate_id: string; idempotency_key: string; payload: any }, now: Date, session: any) {
    try {
      await this.connection.collection('domain_outbox').updateOne(
        { aggregate_type: 'pharmacy', aggregate_id: event.aggregate_id, event_type: event.type, idempotency_key: event.idempotency_key },
        { $setOnInsert: { aggregate_type: 'pharmacy', aggregate_id: event.aggregate_id, event_type: event.type, idempotency_key: event.idempotency_key, payload: event.payload, state: 'pending', created_at: now } },
        { upsert: true, session },
      );
    } catch (error: any) {
      // The documented unique key makes this race an idempotent replay, not a success-less silent failure.
      if (Number(error?.code) === 11000) return;
      throw error;
    }
  }

  private async expireOffer(candidate: any, now: Date): Promise<'expired' | 'claimed'> {
    const token = uuidv4();
    const lease = new Date(now.getTime() + LEASE_MS);
    const claimed: any = await this.offers.findOneAndUpdate(
      { ...this.claimFilter(candidate.id, 'quote_expires_at', now), status: { $in: ['draft', 'submitted'] } },
      { $set: { expiry_claim: { token, claimed_at: now, lease_expires_at: lease } } }, { new: true },
    ).lean();
    if (!claimed) return 'claimed';
    await this.withTransaction(async (session) => {
      const result = await this.offers.updateOne(
        { id: claimed.id, status: { $in: ['draft', 'submitted'] }, 'expiry_claim.token': token, quote_expires_at: { $lte: now } },
        { $set: { status: 'expired', expired_at: now }, $unset: { expiry_claim: 1 }, $push: { timeline: { ts: now, event: 'expired_by_durable_command', meta: { command: 'expireDuePharmacyOffers' } } } }, { session },
      );
      if (!this.modified(result)) throw new BadRequestException('offer_expiry_claim_lost');
      await this.upsertOutbox({ type: 'pharmacy.offer.expired', aggregate_id: claimed.order_id, idempotency_key: `pharmacy-offer-expired:${claimed.id}:${claimed.version}`, payload: { offer_id: claimed.id, order_id: claimed.order_id, pharmacy_account_id: claimed.pharmacy_account_id, quote_expires_at: claimed.quote_expires_at } }, now, session);
    });
    return 'expired';
  }

  private async createRecipientIntent(broadcast: any, recipientId: string, round: number, now: Date, session: any) {
    try {
      const result: any = await this.connection.collection('pharmacy_broadcast_recipients').updateOne(
        { broadcast_id: broadcast.id, pharmacy_account_id: recipientId },
        { $setOnInsert: { broadcast_id: broadcast.id, order_id: broadcast.order_id, pharmacy_account_id: recipientId, first_notified_round: round, created_at: now } },
        { upsert: true, session },
      );
      const inserted = Number(result?.upsertedCount ?? (result?.upsertedId ? 1 : 0)) === 1;
      if (!inserted) return false;
    } catch (error: any) {
      if (Number(error?.code) === 11000) return false;
      throw error;
    }
    await this.upsertOutbox({
      type: 'pharmacy.broadcast.recipient_added', aggregate_id: broadcast.order_id,
      idempotency_key: `pharmacy-broadcast-recipient:${broadcast.id}:${recipientId}`,
      payload: { broadcast_id: broadcast.id, order_id: broadcast.order_id, pharmacy_account_id: recipientId, round },
    }, now, session);
    return true;
  }

  private async closeBroadcast(claimed: any, token: string, now: Date, reason: string) {
    await this.withTransaction(async (session) => {
      const result = await this.broadcasts.updateOne(
        { id: claimed.id, lock_state: 'open', 'expiry_claim.token': token, round_expires_at: { $lte: now } },
        { $set: { lock_state: 'closed' }, $unset: { expiry_claim: 1, round_expires_at: 1 }, $push: { timeline: { ts: now, event: 'broadcast_closed_by_durable_command', meta: { selection_required: true, reason } } } }, { session },
      );
      if (!this.modified(result)) throw new BadRequestException('broadcast_expiry_claim_lost');
      await this.orders.updateOne(
        { id: claimed.order_id, $or: [{ selected_offer_id: { $exists: false } }, { selected_offer_id: null }] },
        { $set: { status: PharmacyOrderState.MANUAL_REVIEW }, $push: { timeline: { ts: now, event: 'broadcast_expired_manual_review', meta: { broadcast_id: claimed.id, reason } } } }, { session },
      );
      await this.upsertOutbox({
        type: 'pharmacy.broadcast.closed', aggregate_id: claimed.order_id,
        idempotency_key: `pharmacy-broadcast-closed:${claimed.id}:${claimed.current_round}`,
        payload: { broadcast_id: claimed.id, order_id: claimed.order_id, current_round: claimed.current_round, selection_required: true, reason },
      }, now, session);
    });
  }

  private async expireBroadcast(candidate: any, now: Date): Promise<{ outcome: 'advanced' | 'closed' | 'claimed'; recipient_intents: number }> {
    const token = uuidv4();
    const lease = new Date(now.getTime() + LEASE_MS);
    const claimed: any = await this.broadcasts.findOneAndUpdate(
      { ...this.claimFilter(candidate.id, 'round_expires_at', now), lock_state: 'open' },
      { $set: { expiry_claim: { token, claimed_at: now, lease_expires_at: lease } } }, { new: true },
    ).lean();
    if (!claimed) return { outcome: 'claimed', recipient_intents: 0 };

    let stages: Array<{ stage: number; radius_km: number; timeout_seconds: number }>;
    try { stages = await this.broadcastService.getBroadcastStages(); }
    catch (error: any) {
      if (error instanceof ServiceUnavailableException || String(error?.message).includes('validated_pharmacy_broadcast_policy_required')) {
        await this.closeBroadcast(claimed, token, now, 'validated_broadcast_policy_unavailable');
        return { outcome: 'closed', recipient_intents: 0 };
      }
      throw error;
    }
    const nextStage = stages[Number(claimed.current_round || 1)];
    if (!nextStage) {
      await this.closeBroadcast(claimed, token, now, 'final_round_elapsed_without_selected_offer');
      return { outcome: 'closed', recipient_intents: 0 };
    }
    const order: any = await this.orders.findOne({ id: claimed.order_id }).lean();
    const eligible = await this.broadcastService.findEligiblePharmaciesWithin(order?.delivery_address?.geo, nextStage.radius_km);
    const knownRecipients = new Set<string>(Array.isArray(claimed.notified_pharmacies) ? claimed.notified_pharmacies : []);
    const candidateRecipients = eligible.map((profile: any) => String(profile.account_id)).filter((accountId: string) => accountId && !knownRecipients.has(accountId));
    const nextRound = Number(claimed.current_round || 1) + 1;
    const deadline = new Date(now.getTime() + nextStage.timeout_seconds * 1000);
    let recipientIntents = 0;
    await this.withTransaction(async (session) => {
      const uniqueRecipients: string[] = [];
      for (const recipientId of candidateRecipients) {
        if (await this.createRecipientIntent(claimed, recipientId, nextRound, now, session)) uniqueRecipients.push(recipientId);
      }
      const result = await this.broadcasts.updateOne(
        { id: claimed.id, lock_state: 'open', 'expiry_claim.token': token, round_expires_at: { $lte: now } },
        { $set: { current_round: nextRound, current_radius_km: nextStage.radius_km, round_expires_at: deadline }, $addToSet: { notified_pharmacies: { $each: uniqueRecipients } }, $unset: { expiry_claim: 1 }, $push: { timeline: { ts: now, event: 'round_advanced_by_durable_command', meta: { round: nextRound, radius_km: nextStage.radius_km, round_expires_at: deadline, recipient_intents: uniqueRecipients.length } } } }, { session },
      );
      if (!this.modified(result)) throw new BadRequestException('broadcast_expiry_claim_lost');
      await this.upsertOutbox({
        type: 'pharmacy.broadcast.round_advanced', aggregate_id: claimed.order_id,
        idempotency_key: `pharmacy-broadcast-round:${claimed.id}:${nextRound}`,
        payload: { broadcast_id: claimed.id, order_id: claimed.order_id, prior_round: claimed.current_round, next_round: nextRound, recipient_intents: uniqueRecipients.length },
      }, now, session);
      recipientIntents = uniqueRecipients.length;
    });
    return { outcome: 'advanced', recipient_intents: recipientIntents };
  }

  async expireDuePharmacyOffers(now: Date = new Date(), cursor: ExpiryCursor = {}, requestedLimit?: number): Promise<CommandResult> {
    const limit = this.limit(requestedLimit);
    const offerRows: any[] = await this.offers.find({ status: { $in: ['draft', 'submitted'] }, quote_expires_at: { $lte: now }, ...(cursor.offer_id ? { id: { $gt: cursor.offer_id } } : {}) }).sort({ id: 1 }).limit(limit).lean();
    const broadcastRows: any[] = await this.broadcasts.find({ lock_state: 'open', round_expires_at: { $lte: now }, ...(cursor.broadcast_id ? { id: { $gt: cursor.broadcast_id } } : {}) }).sort({ id: 1 }).limit(limit).lean();
    const result: CommandResult = { now, scanned_offers: offerRows.length, expired_offers: 0, scanned_broadcasts: broadcastRows.length, advanced_rounds: 0, closed_broadcasts: 0, recipient_intents: 0, skipped_claimed: 0, next_cursor: null };
    for (const offer of offerRows) { const outcome = await this.expireOffer(offer, now); if (outcome === 'expired') result.expired_offers++; else result.skipped_claimed++; }
    for (const broadcast of broadcastRows) {
      const outcome = await this.expireBroadcast(broadcast, now);
      if (outcome.outcome === 'advanced') result.advanced_rounds++;
      if (outcome.outcome === 'closed') result.closed_broadcasts++;
      if (outcome.outcome === 'claimed') result.skipped_claimed++;
      result.recipient_intents += outcome.recipient_intents;
    }
    if (offerRows.length === limit || broadcastRows.length === limit) result.next_cursor = { offer_id: offerRows.length ? offerRows[offerRows.length - 1].id : cursor.offer_id, broadcast_id: broadcastRows.length ? broadcastRows[broadcastRows.length - 1].id : cursor.broadcast_id };
    return result;
  }
}
