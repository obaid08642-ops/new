/**
 * Phase 8: Pharmacy Broadcast Service
 * Implements the broadcast-first workflow loading stages from SystemConfig.
 * If no FULL_ACCEPT exists, runs the Best Partial Match ranking algorithm.
 * Exposes reject/decline broadcast logging rejections to the Shortage Engine.
 */
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, GoneException, Logger, Inject } from '@nestjs/common';
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

  /** Fetch broadcast stages config dynamically from SystemConfig */
  async getBroadcastStages(): Promise<Array<{ stage: number; radius_km: number; timeout_seconds: number }>> {
    const config = await this.configs.findOne({ key: 'pharmacy_broadcast_stages' }).lean();
    if (config && Array.isArray(config.value)) {
      return config.value;
    }
    // Default fallback
    return [
      { stage: 1, radius_km: 3, timeout_seconds: 90 },
      { stage: 2, radius_km: 5, timeout_seconds: 90 },
      { stage: 3, radius_km: 10, timeout_seconds: 90 }
    ];
  }

  /** Patient submit → starts the broadcast (round 1). */
  async start(order: PharmacyOrder): Promise<PharmacyBroadcast> {
    const existing = await this.broadcasts.findOne({ order_id: order.id });
    if (existing && existing.lock_state !== 'closed') return existing;
    
    const stages = await this.getBroadcastStages();
    const round1 = stages[0];
    const expirySeconds = Math.min(3600, Math.max(60, stages.reduce((sum, stage) => sum + Math.max(0, Number(stage.timeout_seconds) || 0), 0)));
    
    const bc = await this.broadcasts.create({
      id: uuidv4(),
      order_id: order.id,
      patient_account_id: order.patient_account_id,
      current_round: 1,
      current_radius_km: round1.radius_km,
      max_radius_km: stages[stages.length - 1].radius_km,
      round_radii_km: stages.map(s => s.radius_km),
      lock_state: 'open',
      expires_at: new Date(Date.now() + expirySeconds * 1000),
      expiry_version: 1,
      expiry_artifacts_pending: false,
      timeline: [{ ts: new Date(), event: 'broadcast_started', meta: { radius: round1.radius_km, expiry_seconds: expirySeconds, expiry_policy_version: 'broadcast-stages-v1' } }],
    });
    
    await this.broadcastRound(bc, order);
    order.status = PharmacyOrderState.BROADCASTING;
    order.timeline.push({ ts: new Date(), event: 'broadcasting_round_1', meta: { radius: round1.radius_km } });
    await order.save();
    
    this.bus.emit({ type: 'broadcast.sent', entity_type: 'broadcast', entity_id: bc.id, patient_account_id: order.patient_account_id, reason_code: 'round_1', meta: { order_id: order.id, radius: round1.radius_km, pharmacies: bc.notified_pharmacies.length } }).catch(() => null);
    return bc;
  }

  /** Internal: notify all pharmacies within current radius about the order. */
  private async broadcastRound(bc: PharmacyBroadcast, order: PharmacyOrder) {
    const center = order.delivery_address?.geo;
    const pharms = await this.findPharmaciesWithin(center, bc.current_radius_km);
    const newPharms = pharms.filter(p => !bc.notified_pharmacies.includes(p.account_id));
    for (const p of newPharms) {
      await this.notif.notifyPharmacyBroadcast(p.account_id, order, bc).catch(() => null);
      bc.notified_pharmacies.push(p.account_id);
    }
    bc.timeline.push({ ts: new Date(), event: 'round_broadcast', meta: { round: bc.current_round, radius: bc.current_radius_km, new_pharmacies: newPharms.length, total_pharmacies: bc.notified_pharmacies.length } });
    await bc.save();
  }

  /** Pharmacy claims "FULL_ACCEPT" — atomic winner-take-all. */
  async claimHaveAll(user: any, order_id: string, body?: { eta_minutes?: number; delivery_fee?: number }): Promise<any> {
    throw new GoneException('legacy_broadcast_claim_deprecated_use_inventory_backed_offer');
    if (!isProviderRole(user?.role)) throw new ForbiddenException('provider_scope_required');
    const bc = await this.broadcasts.findOne({ order_id });
    if (!bc) throw new NotFoundException('broadcast_not_found');
    if (!bc.notified_pharmacies.includes(user.id)) throw new ForbiddenException('not_in_broadcast');
    
    // Redis SETNX Exclusivity Lock (5 seconds)
    const lockKey = `lock:broadcast:accept:${order_id}`;
    const redisClient = this.redisService.getClient();
    const lockAcquired = await redisClient.set(lockKey, user.id, 'PX', 5000, 'NX');
    if (!lockAcquired) {
      throw new BadRequestException('Order is currently locked by another pharmacy processing acceptance. Please wait.');
    }

    // Atomic lock attempt: only succeed if still open.
    const locked = await this.broadcasts.findOneAndUpdate(
      { id: bc.id, lock_state: 'open' },
      { $set: { lock_state: 'locked', locked_to_pharmacy_account_id: user.id, locked_at: new Date() }, $push: { timeline: { ts: new Date(), event: 'locked', meta: { pharmacy_account_id: user.id } } } },
      { new: true },
    );
    if (!locked) {
      throw new BadRequestException(locked === null && bc.locked_to_pharmacy_account_id ? `already_locked_to_${bc.locked_to_pharmacy_account_id === user.id ? 'self' : 'other'}` : 'lock_failed');
    }
    
    // Record this pharmacy's response as fully accepted
    locked.responses.push({
      pharmacy_account_id: user.id, pharmacy_name: user.name_ar || 'Pharmacy', response: 'have_all',
      items: (await this.orders.findOne({ id: order_id }))!.items.map((it: any) => ({ order_item_id: it.id, have: 'yes', qty_available: it.qty })),
      eta_minutes: body?.eta_minutes, delivery_fee: body?.delivery_fee,
      responded_at: new Date(),
    });
    locked.markModified('responses');
    await locked.save();

    // Materialize a single allocation for the winner
    const order = await this.orders.findOne({ id: order_id });
    if (!order) throw new NotFoundException('order_not_found');
    const items: any[] = [];
    let subtotal = 0;
    
    for (const it of order.items) {
      const invItem = await this.inv.findOne({ provider_account_id: user.id, $or: [{ sku: it.matched_sku }, { name_ar: it.name_ar }, { name_en: it.name_en }] });
      const qty = it.qty;
      let reserved = false;
      if (invItem && invItem.stock >= qty) {
        const r = await this.inv.findOneAndUpdate({ id: invItem.id, stock: { $gte: qty } }, { $inc: { stock: -qty } });
        reserved = !!r;
      }
      
      const med = await this.medicines.findOne({ $or: [{ barcode: it.matched_sku }, { name_ar: it.raw_name }] });
      if (med) {
        await this.shortage.logAcceptance(med.id, order_id, user.id);
      }

      if (reserved) {
        items.push({ id: uuidv4(), order_item_id: it.id, action: AllocationItemAction.AVAILABLE, inventory_id: invItem!.id, sku: invItem!.sku, name: invItem!.name_ar || invItem!.name_en, qty_requested: qty, qty_offered: qty, unit_price: invItem!.price, updated_at: new Date() });
        subtotal += (invItem!.price || 0) * qty;
      } else {
        items.push({ id: uuidv4(), order_item_id: it.id, action: AllocationItemAction.UNAVAILABLE, sku: it.matched_sku, name: it.name_ar || it.name_en, qty_requested: qty, qty_offered: 0, notes: 'stock_unavailable_at_lock', updated_at: new Date() });
      }
    }
    
    const itemCount = items.filter(i => i.action === AllocationItemAction.AVAILABLE).length;
    const prepMin = itemCount <= 3 ? 18 : itemCount <= 7 ? 30 : 50;
    const alloc = await this.allocs.create({
      id: uuidv4(),
      order_id: order_id, pharmacy_account_id: user.id,
      status: PharmacyAllocationState.PENDING_REVIEW,
      items, totals: { subtotal, delivery_fee: 0, total: subtotal, currency: 'SAR' },
      estimated_preparation_minutes: prepMin,
      review_expires_at: new Date(Date.now() + REVIEW_TIMEOUT_MINUTES * 60_000),
      match_breakdown: { source: 'broadcast_have_all', radius_km: bc.current_radius_km, round: bc.current_round },
      timeline: [{ ts: new Date(), event: 'created_by_broadcast_have_all', meta: { round: bc.current_round } }],
    });
    
    // Update order
    order.allocations = [alloc.id];
    order.splits_count = 1;
    order.split_strategy = 'single';
    order.status = PharmacyOrderState.FULLY_ALLOCATED;
    order.timeline.push({ ts: new Date(), event: 'broadcast_locked_to_pharmacy', meta: { pharmacy_account_id: user.id, round: bc.current_round } });
    await order.save();
    
    this.bus.emit({ type: 'broadcast.accepted', entity_type: 'broadcast', entity_id: locked.id, actor_account_id: user.id, actor_role: 'provider', pharmacy_account_id: user.id, patient_account_id: order.patient_account_id, reason_code: 'have_all', meta: { order_id, round: bc.current_round, allocation_id: alloc.id } }).catch(() => null);
    this.bus.emit({ type: 'allocation.created', entity_type: 'allocation', entity_id: alloc.id, actor_account_id: user.id, actor_role: 'provider', pharmacy_account_id: user.id, patient_account_id: order.patient_account_id, reason_code: 'broadcast_have_all', meta: { order_id, items: items.length, total: subtotal } }).catch(() => null);
    
    await this.notif.notifyPatientSplitCompleted(order).catch(() => null);
    for (const pid of bc.notified_pharmacies) {
      if (pid !== user.id) {
        await this.notif.notifyPharmacyBroadcastCancelled(pid, order.id, 'won_by_other_pharmacy').catch(() => null);
      }
    }
    return { broadcast: locked.toObject(), allocation: alloc.toObject() };
  }

  /** Pharmacy records PARTIAL_ACCEPT (partial availability + per-item alternatives). */
  async respondPartial(user: any, order_id: string, body: { items: Array<{ order_item_id: string; have: 'yes' | 'no' | 'alternative'; qty_available?: number; unit_price?: number; alternative?: any }>; eta_minutes?: number; delivery_fee?: number }): Promise<any> {
    if (!isProviderRole(user?.role)) throw new ForbiddenException('provider_scope_required');
    const bc = await this.broadcasts.findOne({ order_id });
    if (!bc) throw new NotFoundException('broadcast_not_found');
    if (bc.lock_state === 'locked') throw new BadRequestException('already_locked');
    if (!bc.notified_pharmacies.includes(user.id)) throw new ForbiddenException('not_in_broadcast');
    
    // Replace existing response by this pharmacy (idempotent)
    bc.responses = bc.responses.filter(r => r.pharmacy_account_id !== user.id);
    bc.responses.push({ pharmacy_account_id: user.id, response: 'partial', items: body.items, eta_minutes: body.eta_minutes, delivery_fee: body.delivery_fee, responded_at: new Date() });
    bc.markModified('responses');
    bc.timeline.push({ ts: new Date(), event: 'partial_response', meta: { pharmacy_account_id: user.id, items: body.items.length } });
    await bc.save();

    // Auto-create/open chat threads immediately for items marked 'no' or 'alternative'
    for (const item of body.items) {
      if (item.have === 'no' || item.have === 'alternative') {
        const thread = await this.chatService.openOrGetThread(order_id, item.order_item_id, user.id);
        const text = item.have === 'no' ? 'هذا الدواء غير متوفر حالياً.' : `تم اقتراح بديل: ${item.alternative?.name || 'بديل ماركة أخرى'}`;
        await this.chatService.postMessage({ id: 'system', role: 'system' }, thread.id, { text });
      } else {
        // Log acceptance in shortage logs for items that are available
        const orderItem = (await this.orders.findOne({ id: order_id }))?.items.find(i => i.id === item.order_item_id);
        if (orderItem) {
          const med = await this.medicines.findOne({ $or: [{ barcode: orderItem.matched_sku }, { name_ar: orderItem.raw_name }] });
          if (med) {
            await this.shortage.logAcceptance(med.id, order_id, user.id);
          }
        }
      }
    }

    const order = await this.orders.findOne({ id: order_id });
    if (order && order.status === PharmacyOrderState.BROADCASTING) {
      order.status = PharmacyOrderState.AWAITING_FULL_ACCEPTANCE;
      order.timeline.push({ ts: new Date(), event: 'awaiting_full_acceptance', meta: { pharmacy_account_id: user.id } });
      await order.save();
    }
    return { ok: true, recorded_items: body.items.length };
  }

  /** Pharmacy declines the broadcast explicitly (REJECT). Logs rejections to Shortage Engine. */
  async respondReject(user: any, order_id: string, body?: { reason?: string }): Promise<any> {
    if (!isProviderRole(user?.role)) throw new ForbiddenException('provider_scope_required');
    const bc = await this.broadcasts.findOne({ order_id });
    if (!bc) throw new NotFoundException('broadcast_not_found');
    if (bc.lock_state === 'locked') throw new BadRequestException('already_locked');
    if (!bc.notified_pharmacies.includes(user.id)) throw new ForbiddenException('not_in_broadcast');

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
  async advanceRound(order_id: string): Promise<any> {
    const bc = await this.broadcasts.findOne({ order_id });
    if (!bc) throw new NotFoundException('broadcast_not_found');
    if (bc.lock_state !== 'open') throw new BadRequestException(`cannot_advance_${bc.lock_state}`);
    
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
    bc.current_round = nextIdx + 1;
    bc.current_radius_km = nextStage.radius_km;
    bc.timeline.push({ ts: new Date(), event: 'round_advanced', meta: { round: bc.current_round, radius: bc.current_radius_km } });
    await bc.save();
    
    const order = await this.orders.findOne({ id: order_id });
    if (order) await this.broadcastRound(bc, order);
    
    this.bus.emit({ type: 'broadcast.sent', entity_type: 'broadcast', entity_id: bc.id, reason_code: `round_${bc.current_round}`, patient_account_id: bc.patient_account_id, meta: { order_id, radius_km: bc.current_radius_km, pharmacies: bc.notified_pharmacies.length } }).catch(() => null);
    return bc.toObject();
  }

  /** Run Best Partial Match algorithm: ranks partials, creates allocation, and opens chat threads. */
  async runBestPartialMatch(bc: PharmacyBroadcast, order: PharmacyOrder): Promise<any> {
    const partialResponses = bc.responses.filter(r => r.response === 'partial');
    if (partialResponses.length === 0) {
      return this.fallbackSplit(order.id);
    }

    // Ranking algorithm:
    // 1. Highest available item count
    // 2. Nearest pharmacy
    // 3. Highest alternative coverage
    partialResponses.sort((a, b) => {
      const aAvail = a.items.filter(it => it.have === 'yes').length;
      const bAvail = b.items.filter(it => it.have === 'yes').length;
      if (bAvail !== aAvail) return bAvail - aAvail;

      const aDist = a.distance_km || 999;
      const bDist = b.distance_km || 999;
      if (aDist !== bDist) return aDist - bDist;

      const aAlt = a.items.filter(it => it.have === 'alternative').length;
      const bAlt = b.items.filter(it => it.have === 'alternative').length;
      return bAlt - aAlt;
    });

    const bestMatch = partialResponses[0];
    
    // Set lock state
    bc.lock_state = 'locked';
    bc.locked_to_pharmacy_account_id = bestMatch.pharmacy_account_id;
    bc.locked_at = new Date();
    bc.timeline.push({ ts: new Date(), event: 'best_partial_match_locked', meta: { pharmacy_account_id: bestMatch.pharmacy_account_id } });
    await bc.save();

    // Materialize allocation
    const items: any[] = [];
    let subtotal = 0;
    
    for (const it of order.items) {
      const respItem = bestMatch.items.find(ri => ri.order_item_id === it.id);
      if (respItem && respItem.have === 'yes') {
        items.push({
          id: uuidv4(),
          order_item_id: it.id,
          action: AllocationItemAction.AVAILABLE,
          sku: respItem.alternative?.sku || it.matched_sku,
          name: respItem.alternative?.name || it.name_ar || it.name_en,
          qty_requested: it.qty,
          qty_offered: respItem.qty_available || it.qty,
          unit_price: respItem.unit_price || 0,
          updated_at: new Date()
        });
        subtotal += (respItem.unit_price || 0) * (respItem.qty_available || it.qty);
      } else if (respItem && respItem.have === 'alternative') {
        items.push({
          id: uuidv4(),
          order_item_id: it.id,
          action: AllocationItemAction.SUBSTITUTE,
          sku: respItem.alternative?.sku || it.matched_sku,
          name: respItem.alternative?.name || it.name_ar || it.name_en,
          qty_requested: it.qty,
          qty_offered: respItem.qty_available || it.qty,
          unit_price: respItem.unit_price || 0,
          updated_at: new Date()
        });
      } else {
        items.push({
          id: uuidv4(),
          order_item_id: it.id,
          action: AllocationItemAction.UNAVAILABLE,
          sku: it.matched_sku,
          name: it.name_ar || it.name_en,
          qty_requested: it.qty,
          qty_offered: 0,
          updated_at: new Date()
        });
      }
    }

    const alloc = await this.allocs.create({
      id: uuidv4(),
      order_id: order.id,
      pharmacy_account_id: bestMatch.pharmacy_account_id,
      status: PharmacyAllocationState.PENDING_REVIEW,
      items,
      totals: { subtotal, delivery_fee: 0, total: subtotal, currency: 'SAR' },
      estimated_preparation_minutes: 30,
      review_expires_at: new Date(Date.now() + REVIEW_TIMEOUT_MINUTES * 60_000),
      match_breakdown: { source: 'best_partial_match', radius_km: bc.current_radius_km, round: bc.current_round },
      timeline: [{ ts: new Date(), event: 'created_by_best_partial_match' }],
    });

    order.allocations = [alloc.id];
    order.splits_count = 1;
    order.split_strategy = 'single';
    order.status = PharmacyOrderState.NEGOTIATING_SUBSTITUTES;
    order.timeline.push({ ts: new Date(), event: 'allocated_via_best_partial_match', meta: { pharmacy_account_id: bestMatch.pharmacy_account_id } });
    await order.save();

    // Auto-create/open chat threads for alternative or unavailable items
    for (const item of items) {
      if (item.action === AllocationItemAction.SUBSTITUTE || item.action === AllocationItemAction.UNAVAILABLE) {
        const thread = await this.chatService.openOrGetThread(order.id, item.order_item_id, bestMatch.pharmacy_account_id);
        const reasonText = item.action === AllocationItemAction.SUBSTITUTE ? 'اقتراح بديل' : 'الصنف غير متوفر';
        await this.chatService.postMessage(
          { id: 'system', role: 'system' },
          thread.id,
          { text: `تنبيه تلقائي: تم تحديد ${reasonText} لهذا الدواء.` }
        );
      }
    }

    await this.notif.notifyPatientSplitCompleted(order).catch(() => null);
    
    // Notify losing pharmacies
    for (const pid of bc.notified_pharmacies) {
      if (pid !== bestMatch.pharmacy_account_id) {
        await this.notif.notifyPharmacyBroadcastCancelled(pid, order.id, 'won_by_other_pharmacy').catch(() => null);
      }
    }

    return { broadcast: bc.toObject(), allocation: alloc.toObject() };
  }

  /** Final fallback: switch to Smart Split. */
  async fallbackSplit(order_id: string): Promise<any> {
    const bc = await this.broadcasts.findOne({ order_id });
    if (bc) {
      bc.lock_state = 'fallback_split';
      bc.timeline.push({ ts: new Date(), event: 'fallback_split' });
      await bc.save();
    }
    const order = await this.orders.findOne({ id: order_id });
    if (!order) throw new NotFoundException('order_not_found');
    order.status = PharmacyOrderState.ALLOCATING;
    order.timeline.push({ ts: new Date(), event: 'fallback_to_smart_split' });
    await order.save();
    const final = await this.split.runForOrder(order.id);
    await this.notif.notifyPatientSplitCompleted(final).catch(() => null);
    this.bus.emit({ type: 'broadcast.fallback_split', entity_type: 'broadcast', entity_id: bc?.id || order_id, patient_account_id: order.patient_account_id, reason_code: 'max_rounds_exceeded', meta: { order_id, status_after: final.status } }).catch(() => null);
    return final.toObject();
  }

  // ============== INTERNAL: geo filter ==============
  private async findPharmaciesWithin(center: any, radius_km: number) {
    const accs = await (this.profiles as any).db.collection('provider_accounts').find({ provider_type: 'pharmacy', status: 'approved' }).project({ id: 1 }).toArray();
    if (!accs.length || !center?.lat) return [];
    const ids = accs.map((a: any) => a.id);
    const profs = await this.profiles.find({ account_id: { $in: ids }, provider_type: 'pharmacy' }).lean();
    const avs = await this.avails.find({ provider_account_id: { $in: ids }, status: { $in: [ProviderAvailabilityStatus.ACCEPTING_ORDERS, ProviderAvailabilityStatus.ONLINE] } }).lean();
    const okIds = new Set(avs.map(a => a.provider_account_id));
    const out: any[] = [];
    for (const p of profs) {
      if (!okIds.has(p.account_id)) continue;
      if (!p.geo?.lat) continue;
      
      // Delivery mode rule:
      // If external delivery required, restrict radius according to platform delivery rule (e.g. max 7km)
      const pharm = p as any;
      let activeRadius = pharm.max_delivery_radius_km || pharm.delivery_radius_km || radius_km;
      if (pharm.delivery_mode === 'external_delivery_required') {
        activeRadius = Math.min(activeRadius, 7); // restricted to platform rule (7km max)
      } else if (pharm.delivery_mode === 'self_delivery') {
        // self delivery can go up to 20km+
        activeRadius = Math.max(activeRadius, 20);
      }
      
      const d = this.geo.distanceKm({ lat: p.geo.lat, lng: p.geo.lng }, center);
      if (d <= activeRadius) out.push({ ...p, _distance: d });
    }
    return out;
  }

  async listForPharmacy(user: any): Promise<any> {
    if (!isProviderRole(user?.role)) throw new ForbiddenException();
    const bcs = await this.broadcasts.find({ notified_pharmacies: user.id, lock_state: { $in: ['open'] } }).sort({ createdAt: -1 }).lean();
    const orders = await this.orders.find({ id: { $in: bcs.map(b => b.order_id) } }).lean();
    const ordersMap = new Map(orders.map(o => [o.id, o]));
    
    // Resolve patient details
    const patientIds = Array.from(new Set(orders.map(o => o.patient_account_id).filter(Boolean)));
    const UserModel = this.broadcasts.db.model('User');
    const patients = await UserModel.find({ id: { $in: patientIds } }, { id: 1, full_name: 1, phone: 1 }).lean();
    const patientMap = new Map(patients.map((p: any) => [p.id, p]));

    return bcs.map(b => {
      const order = ordersMap.get(b.order_id);
      const patient = order ? patientMap.get((order as any).patient_account_id) : null;
      return {
        broadcast: b,
        order,
        patient_name: (patient as any)?.full_name || 'مريض نبض',
        patient_phone: (patient as any)?.phone || '',
      };
    });
  }

  async detail(user: any, broadcast_id: string): Promise<any> {
    const bc = await this.broadcasts.findOne({ id: broadcast_id }).lean();
    if (!bc) throw new NotFoundException();
    if (user?.role === 'provider' && !bc.notified_pharmacies.includes(user.id)) throw new ForbiddenException();
    if (user?.role === 'patient' && bc.patient_account_id !== user.id) throw new ForbiddenException();
    const order = await this.orders.findOne({ id: bc.order_id }).lean();
    
    let patient_name = 'مريض نبض';
    let patient_phone = '';
    if (order) {
      const UserModel = this.broadcasts.db.model('User');
      const patient = (await UserModel.findOne({ id: order.patient_account_id }, { full_name: 1, phone: 1 }).lean()) as any;
      if (patient) {
        patient_name = patient.full_name;
        patient_phone = patient.phone;
      }
    }

    return { broadcast: bc, order, patient_name, patient_phone };
  }

  /** Sweep closures */
  async expireStaleBroadcasts(): Promise<any> {
    const stages = await this.getBroadcastStages();
    const activeBroadcasts = await this.broadcasts.find({ lock_state: 'open' });
    let advanced = 0;
    let fallbacked = 0;
    let no_pharmacy = 0;
    
    for (const b of activeBroadcasts) {
      try {
        const nextIdx = b.current_round; // 1-based index
        const currentStage = stages[nextIdx - 1];
        const timeoutMs = (currentStage?.timeout_seconds || 90) * 1000;
        const elapsedMs = Date.now() - (b as any).updatedAt.getTime();
        
        if (elapsedMs >= timeoutMs) {
          if (nextIdx < stages.length) {
            await this.advanceRound(b.order_id);
            advanced++;
          } else {
            // Last round timed out → run Best Partial Match
            await this.runBestPartialMatch(b, (await this.orders.findOne({ id: b.order_id }))!);
            fallbacked++;
          }
        }
      } catch (e: any) {
        if (String(e?.message || '').includes('no_pharmacy')) no_pharmacy++;
      }
    }
    
    return { scanned: activeBroadcasts.length, advanced, fallbacked, no_pharmacy };
  }
}
