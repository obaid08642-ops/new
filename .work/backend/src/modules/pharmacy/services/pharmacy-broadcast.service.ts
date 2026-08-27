/**
 * Phase 8: Pharmacy Broadcast Service
 * Implements the broadcast-first workflow loading stages from SystemConfig.
 * If no FULL_ACCEPT exists, runs the Best Partial Match ranking algorithm.
 * Exposes reject/decline broadcast logging rejections to the Shortage Engine.
 */
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ServiceUnavailableException, Logger, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  PharmacyOrder, PharmacyOrderState,
  PharmacyAllocation, PharmacyAllocationState, AllocationItemAction,
  PharmacyBroadcast,
} from '../schemas/pharmacy.schema';
import { PharmacyInventoryItem } from '../../provider/schemas/capabilities.schema';
import { ProviderProfile } from '../../provider/schemas';
import { ProviderAvailability, ProviderAvailabilityStatus } from '../../provider/schemas/requests.schema';
import { GeoEngineService } from '../../provider/services/geo-engine.service';
import { SmartSplitService } from './smart-split.service';
import { PharmacyNotificationService } from './pharmacy-notification.service';
import { EventBusService } from '../../events/event-bus.service';
import { SystemConfig } from '../../../schemas/system-config.schema';
import { DrugRejectionLog } from '../../../schemas/drug-rejection-log.schema';
import { PharmacyShortageService } from './pharmacy-shortage.service';
import { PharmacyChatService } from './pharmacy-chat.service';
import { RedisService } from '../../redis/redis.service';
import { PharmacyOrderRepository } from "./repositories/pharmacyorder.repository";
import { PharmacyAllocationRepository } from "./repositories/pharmacyallocation.repository";
import { PharmacyBroadcastRepository } from "./repositories/pharmacybroadcast.repository";
import { PharmacyInventoryItemRepository } from "./repositories/pharmacyinventoryitem.repository";
import { ProviderAccountProfileRepository } from "./repositories/provideraccountprofile.repository";
import { ProviderAvailabilityRepository } from "./repositories/provideravailability.repository";
import { SystemConfigRepository } from "./repositories/systemconfig.repository";
import { DrugRejectionLogRepository } from "./repositories/drugrejectionlog.repository";
import { MedicineRepository } from "./repositories/medicine.repository";
import { isProviderRole } from '../../../common/enums';

const REVIEW_TIMEOUT_MINUTES = 12;

@Injectable()
export class PharmacyBroadcastService {
  private logger = new Logger('PharmacyBroadcast');
  constructor(
    @Inject('PharmacyOrderRepository') private orders: PharmacyOrderRepository,
    @Inject('PharmacyAllocationRepository') private allocs: PharmacyAllocationRepository,
    @Inject('PharmacyBroadcastRepository') private broadcasts: PharmacyBroadcastRepository,
    @Inject('PharmacyInventoryItemRepository') private inv: PharmacyInventoryItemRepository,
    @Inject('ProviderAccountProfileRepository') private profiles: ProviderAccountProfileRepository,
    @Inject('ProviderAvailabilityRepository') private avails: ProviderAvailabilityRepository,
    @Inject('SystemConfigRepository') private configs: SystemConfigRepository,
    @Inject('DrugRejectionLogRepository') private rejections: DrugRejectionLogRepository,
    @Inject('MedicineRepository') private medicines: MedicineRepository,
    private geo: GeoEngineService,
    private split: SmartSplitService,
    private notif: PharmacyNotificationService,
    private bus: EventBusService,
    private shortage: PharmacyShortageService,
    private chatService: PharmacyChatService,
    private redisService: RedisService,
  ) {}

  /** Require a real approved pharmacy account regardless of the JWT role alias. */
  private async assertActiveNotifiedPharmacy(user: any, broadcast?: any) {
    if (!user?.id) throw new ForbiddenException('pharmacy_identity_required');
    const account: any = await this.profiles.db.collection('provider_accounts').findOne({
      id: user.id, provider_type: 'pharmacy', status: { $in: ['approved', 'active'] },
    });
    if (!account) throw new ForbiddenException('approved_pharmacy_account_required');
    if (broadcast && (!Array.isArray(broadcast.notified_pharmacies) || !broadcast.notified_pharmacies.includes(user.id))) {
      throw new ForbiddenException('pharmacy_not_notified_for_broadcast');
    }
    return account;
  }

  /** Minimal provider-purpose DTO: excludes patient phone, address, attachments and raw order. */
  private providerBroadcastDto(broadcast: any, order: any) {
    const method = String(order?.payment_method || order?.payment?.method || (order?.insurance_details ? 'insurance' : 'cash')).toLowerCase();
    return {
      id: broadcast.id,
      order_id: broadcast.order_id,
      current_round: broadcast.current_round,
      current_radius_km: broadcast.current_radius_km,
      lock_state: broadcast.lock_state,
      offer_deadline_hint: broadcast.round_expires_at || null,
      payment_summary: { method, insurance_required: method === 'insurance' },
      items: (order?.items || []).map((item: any) => ({
        order_item_id: item.id,
        name_ar: item.name_ar || item.raw_name || null,
        name_en: item.name_en || null,
        qty_requested: Number(item.qty || 0),
        matched_sku: item.matched_sku || null,
      })),
    };
  }

  /** Broadcast stages are commercial/operational policy and may never silently fall back. */
  async getBroadcastStages(): Promise<Array<{ stage: number; radius_km: number; timeout_seconds: number }>> {
    const config = await this.configs.findOne({ key: 'pharmacy_broadcast_stages' }).lean();
    const stages = config?.value;
    const valid = Array.isArray(stages) && stages.length > 0 && stages.every((stage: any, index: number) =>
      Number(stage?.stage) === index + 1 && Number.isFinite(Number(stage?.radius_km)) && Number(stage.radius_km) > 0 &&
      Number.isFinite(Number(stage?.timeout_seconds)) && Number(stage.timeout_seconds) > 0,
    );
    if (!valid) throw new ServiceUnavailableException('validated_pharmacy_broadcast_policy_required');
    return stages.map((stage: any) => ({ stage: Number(stage.stage), radius_km: Number(stage.radius_km), timeout_seconds: Number(stage.timeout_seconds) }));
  }

  /** Patient submit → starts the broadcast (round 1). */
  async start(order: PharmacyOrder): Promise<PharmacyBroadcast> {
    const existing = await this.broadcasts.findOne({ order_id: order.id });
    if (existing && existing.lock_state !== 'closed') {
      // Recover a partially persisted initial round idempotently; never leave an open broadcast without intents.
      if (!Array.isArray(existing.notified_pharmacies) || existing.notified_pharmacies.length === 0 || order.status !== PharmacyOrderState.BROADCASTING) {
        await this.broadcastRound(existing, order);
        if (order.status !== PharmacyOrderState.BROADCASTING) {
          order.status = PharmacyOrderState.BROADCASTING;
          order.timeline.push({ ts: new Date(), event: 'broadcasting_round_1_recovered', meta: { radius: existing.current_radius_km } });
          await order.save();
        }
      }
      return existing;
    }
    
    const stages = await this.getBroadcastStages();
    const round1 = stages[0];
    const startedAt = new Date();
    const roundDeadline = new Date(startedAt.getTime() + (round1.timeout_seconds * 1000));
    
    const bc = await this.broadcasts.create({
      id: uuidv4(),
      order_id: order.id,
      patient_account_id: order.patient_account_id,
      current_round: 1,
      current_radius_km: round1.radius_km,
      max_radius_km: stages[stages.length - 1].radius_km,
      round_radii_km: stages.map(s => s.radius_km),
      lock_state: 'open',
      round_expires_at: roundDeadline,
      timeline: [{ ts: startedAt, event: 'broadcast_started', meta: { radius: round1.radius_km, round_expires_at: roundDeadline } }],
    });
    
    await this.broadcastRound(bc, order);
    order.status = PharmacyOrderState.BROADCASTING;
    order.timeline.push({ ts: new Date(), event: 'broadcasting_round_1', meta: { radius: round1.radius_km } });
    await order.save();
    
    // Recipient notification is represented by durable outbox intents from broadcastRound; no direct best-effort emit occurs here.
    return bc;
  }

  /**
   * Persist recipient membership and one notification intent per pharmacy. A later
   * dispatcher may send it; this request never sends push/socket directly.
   */
  private async broadcastRound(bc: PharmacyBroadcast, order: PharmacyOrder) {
    const center = order.delivery_address?.geo;
    const pharms = await this.findEligiblePharmaciesWithin(center, bc.current_radius_km);
    const alreadyNotified = new Set<string>(Array.isArray(bc.notified_pharmacies) ? bc.notified_pharmacies : []);
    const candidates = pharms.map((pharmacy: any) => String(pharmacy.account_id)).filter((id: string) => id && !alreadyNotified.has(id));
    const now = new Date();
    const connection: any = this.broadcasts.model.db;
    const session = await connection.startSession();
    const inserted: string[] = [];
    try {
      await session.withTransaction(async () => {
        const recipients = connection.collection('pharmacy_broadcast_recipients');
        const outbox = connection.collection('domain_outbox');
        for (const pharmacyAccountId of candidates) {
          try {
            const membership: any = await recipients.updateOne(
              { broadcast_id: bc.id, pharmacy_account_id: pharmacyAccountId },
              { $setOnInsert: { broadcast_id: bc.id, order_id: order.id, pharmacy_account_id: pharmacyAccountId, first_notified_round: bc.current_round, created_at: now } },
              { upsert: true, session },
            );
            if (Number(membership?.upsertedCount ?? (membership?.upsertedId ? 1 : 0)) !== 1) continue;
          } catch (error: any) {
            if (Number(error?.code) === 11000) continue;
            throw error;
          }
          inserted.push(pharmacyAccountId);
          try {
            await outbox.updateOne(
              { aggregate_type: 'pharmacy', aggregate_id: order.id, event_type: 'pharmacy.broadcast.recipient_added', idempotency_key: `pharmacy-broadcast-recipient:${bc.id}:${pharmacyAccountId}` },
              { $setOnInsert: { aggregate_type: 'pharmacy', aggregate_id: order.id, event_type: 'pharmacy.broadcast.recipient_added', idempotency_key: `pharmacy-broadcast-recipient:${bc.id}:${pharmacyAccountId}`, payload: { broadcast_id: bc.id, order_id: order.id, pharmacy_account_id: pharmacyAccountId, round: bc.current_round }, state: 'pending', created_at: now } },
              { upsert: true, session },
            );
          } catch (error: any) {
            if (Number(error?.code) !== 11000) throw error;
          }
        }
        const result: any = await this.broadcasts.model.updateOne(
          { id: bc.id, lock_state: 'open' },
          { $addToSet: { notified_pharmacies: { $each: inserted } }, $push: { timeline: { ts: now, event: 'round_recipients_recorded', meta: { round: bc.current_round, radius: bc.current_radius_km, new_pharmacies: inserted.length } } } },
          { session },
        );
        if (Number(result?.matchedCount ?? result?.n ?? 0) !== 1) throw new BadRequestException('broadcast_recipient_transition_conflict');
      });
    } finally { await session.endSession(); }
    bc.notified_pharmacies = Array.from(new Set([...(bc.notified_pharmacies || []), ...inserted]));
  }

  /**
   * Compatibility guard: legacy response commands are disabled because they
   * could reserve stock or store provider-controlled prices before an explicit
   * patient selection. Use PharmacyOfferService draft/submit commands instead.
   */
  async claimHaveAll(): Promise<never> {
    throw new BadRequestException('legacy_broadcast_acceptance_disabled_use_offer_draft');
  }

  async respondPartial(): Promise<never> {
    throw new BadRequestException('legacy_broadcast_acceptance_disabled_use_offer_draft');
  }

  /** Pharmacy declines the broadcast explicitly (REJECT). Logs rejections to Shortage Engine. */
  async respondReject(user: any, order_id: string, body?: { reason?: string }): Promise<any> {
    await this.assertActiveNotifiedPharmacy(user);
    const bc = await this.broadcasts.findOne({ order_id });
    if (!bc) throw new NotFoundException('broadcast_not_found');
    await this.assertActiveNotifiedPharmacy(user, bc);
    if (bc.lock_state === 'locked') throw new BadRequestException('already_locked');

    bc.responses = bc.responses.filter(r => r.pharmacy_account_id !== user.id);
    bc.responses.push({ pharmacy_account_id: user.id, response: 'declined', items: [], responded_at: new Date() });
    bc.markModified('responses');
    bc.timeline.push({ ts: new Date(), event: 'declined', meta: { pharmacy_account_id: user.id, reason: body?.reason } });
    await bc.save();

    // Log rejections for each drug in the order into the shortage engine
    const order = await this.orders.findOne({ id: order_id });
    if (order) {
      for (const item of order.items) {
        const med = await this.medicines.findOne({ $or: [{ barcode: item.matched_sku }, { name_ar: item.raw_name }] });
        if (med) {
          await this.shortage.logRejection(med.id, order_id, user.id);
        }
      }
    }
    return { ok: true };
  }

  /** Advance broadcast to next round. If final round ends with no full accept, runs Best Partial Match. */
  async advanceRound(order_id: string, now = new Date()): Promise<any> {
    const bc = await this.broadcasts.findOne({ order_id });
    if (!bc) throw new NotFoundException('broadcast_not_found');
    if (bc.lock_state !== 'open') throw new BadRequestException(`cannot_advance_${bc.lock_state}`);
    if (!bc.round_expires_at || new Date(bc.round_expires_at).getTime() > now.getTime()) {
      throw new BadRequestException('broadcast_round_not_due');
    }
    
    const stages = await this.getBroadcastStages();
    const nextIdx = bc.current_round; // 1-based round index
    
    if (nextIdx >= stages.length) {
      // No more rounds → trigger Best Partial Match algorithm
      const order = await this.orders.findOne({ id: order_id });
      if (order) {
        return this.runBestPartialMatch(bc, order);
      }
      return this.fallbackSplit(order_id);
    }
    
    const nextStage = stages[nextIdx];
    const advancedAt = new Date();
    const nextDeadline = new Date(advancedAt.getTime() + (nextStage.timeout_seconds * 1000));
    bc.current_round = nextIdx + 1;
    bc.current_radius_km = nextStage.radius_km;
    bc.round_expires_at = nextDeadline;
    bc.timeline.push({ ts: advancedAt, event: 'round_advanced', meta: { round: bc.current_round, radius: bc.current_radius_km, round_expires_at: nextDeadline } });
    await bc.save();
    
    const order = await this.orders.findOne({ id: order_id });
    if (order) await this.broadcastRound(bc, order);
    
    // broadcastRound persisted recipient intents; no direct best-effort event is emitted.
    return bc.toObject();
  }

  /**
   * Legacy fallback is deliberately fail-closed. Ranking a response may inform an
   * operator, but it must never reserve stock, create an allocation, or assign a
   * pharmacy before the patient selects one submitted, unexpired offer.
   */
  async runBestPartialMatch(bc: PharmacyBroadcast, order: PharmacyOrder): Promise<any> {
    bc.lock_state = 'closed';
    bc.timeline.push({ ts: new Date(), event: 'automatic_matching_disabled_selection_required' });
    await bc.save();
    if (!order.selected_offer_id) {
      order.status = PharmacyOrderState.MANUAL_REVIEW;
      order.timeline.push({ ts: new Date(), event: 'no_auto_allocation_after_broadcast', meta: { broadcast_id: bc.id } });
      await order.save();
    }
    await this.notif.notifyPatientSplitCompleted(order).catch(() => null);
    return { broadcast: typeof (bc as any).toObject === 'function' ? (bc as any).toObject() : bc, selection_required: true, reason: 'automatic_allocation_disabled' };
  }

  /** No smart split may bypass explicit patient offer selection. */
  async fallbackSplit(order_id: string): Promise<any> {
    const bc = await this.broadcasts.findOne({ order_id });
    const order = await this.orders.findOne({ id: order_id });
    if (!order) throw new NotFoundException('order_not_found');
    if (bc) {
      bc.lock_state = 'closed';
      bc.timeline.push({ ts: new Date(), event: 'fallback_split_disabled_manual_review' });
      await bc.save();
    }
    if (!order.selected_offer_id) {
      order.status = PharmacyOrderState.MANUAL_REVIEW;
      order.timeline.push({ ts: new Date(), event: 'fallback_requires_manual_review', meta: { broadcast_id: bc?.id || null } });
      await order.save();
    }
    return { order_id, selection_required: true, reason: 'automatic_split_disabled' };
  }

  // ============== INTERNAL: geo filter ==============
  /** Eligible, approved and available recipient set computed server-side for a given round. */
  async findEligiblePharmaciesWithin(center: any, radius_km: number) {
    const accs = await (this.profiles as any).db.collection('provider_accounts').find({ provider_type: 'pharmacy', status: { $in: ['approved', 'active'] } }).project({ id: 1 }).toArray();
    if (!accs.length || !Number.isFinite(Number(center?.lat)) || !Number.isFinite(Number(center?.lng)) || !Number.isFinite(Number(radius_km)) || Number(radius_km) <= 0) return [];
    const ids = accs.map((a: any) => a.id);
    const profs = await this.profiles.find({ account_id: { $in: ids }, provider_type: 'pharmacy' }).lean();
    const avs = await this.avails.find({ provider_account_id: { $in: ids }, status: { $in: [ProviderAvailabilityStatus.ACCEPTING_ORDERS, ProviderAvailabilityStatus.ONLINE] } }).lean();
    const okIds = new Set(avs.map(a => a.provider_account_id));
    const out: any[] = [];
    for (const p of profs) {
            if (!okIds.has(p.account_id)) continue;
      if (!Number.isFinite(Number(p.geo?.lat)) || !Number.isFinite(Number(p.geo?.lng))) continue;
      const pharm = p as any;
      const providerRadius = Number(pharm.max_delivery_radius_km ?? pharm.delivery_radius_km);
      const policyDoc: any = await this.configs.findOne({ key: 'pharmacy_platform_radius_km' }).lean();
      const platformRadius = Number(policyDoc?.value);
      const effectiveRadius = Math.min(
        Number(radius_km),
        Number.isFinite(providerRadius) && providerRadius > 0 ? providerRadius : Number(radius_km),
        Number.isFinite(platformRadius) && platformRadius > 0 ? platformRadius : Number(radius_km),
      );
      const d = this.geo.distanceKm({ lat: Number(p.geo.lat), lng: Number(p.geo.lng) }, center);
      if (Number.isFinite(d) && d <= effectiveRadius) out.push({ ...p, _distance: d });
    }
    return out;
  }

  async listForPharmacy(user: any): Promise<any> {
    await this.assertActiveNotifiedPharmacy(user);
    const bcs = await this.broadcasts.find({ notified_pharmacies: user.id, lock_state: { $in: ['open'] } }).sort({ createdAt: -1 }).lean();
    const orders = await this.orders.find({ id: { $in: bcs.map(b => b.order_id) } }).lean();
    const ordersMap = new Map(orders.map(o => [o.id, o]));
    return bcs.map((broadcast) => this.providerBroadcastDto(broadcast, ordersMap.get(broadcast.order_id)));
  }

  async detail(user: any, broadcast_id: string): Promise<any> {
    await this.assertActiveNotifiedPharmacy(user);
    const bc = await this.broadcasts.findOne({ id: broadcast_id }).lean();
    if (!bc) throw new NotFoundException('broadcast_not_found');
    await this.assertActiveNotifiedPharmacy(user, bc);
    const order = await this.orders.findOne({ id: bc.order_id }).lean();
    if (!order) throw new NotFoundException('order_not_found');
    return this.providerBroadcastDto(bc, order);
  }

  /** Compatibility entry point intentionally disabled: use the bounded durable expiry command. */
  async expireStaleBroadcasts(): Promise<never> {
    throw new ServiceUnavailableException('legacy_expiry_sweep_disabled_use_expire_due_command');
  }
}
