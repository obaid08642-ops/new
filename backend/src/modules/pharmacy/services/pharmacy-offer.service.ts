import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { isProviderRole } from '../../../common/enums';
import { PharmacyAllocationState, PharmacyOrderState } from '../schemas/pharmacy.schema';
import { SubmitPharmacyOfferDto } from '../dto/pharmacy-offer.dto';
import { assertGovernedPharmacyTransition } from '../../../common/governed-workflow';
import { PharmacyOrderState as GovernedPharmacyOrderState } from '@nabd/shared-contracts';

export function calculatePharmacyQuote(lines: Array<{ requested_qty: number; offered_qty: number; available: boolean; unit_price: number }>, deliveryFee: number) {
  if (!Number.isFinite(deliveryFee) || deliveryFee < 0) throw new BadRequestException('invalid_delivery_fee');
  const subtotal = lines.reduce((sum, line) => sum + (line.available ? line.offered_qty * line.unit_price : 0), 0);
  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const roundedDelivery = Math.round(deliveryFee * 100) / 100;
  return { subtotal: roundedSubtotal, delivery_fee: roundedDelivery, total: Math.round((roundedSubtotal + roundedDelivery) * 100) / 100, currency: 'SAR' };
}

@Injectable()
export class PharmacyOfferService {
  constructor(
    @InjectModel('PharmacyOrder') private readonly orders: Model<any>,
    @InjectModel('PharmacyOffer') private readonly offers: Model<any>,
    @InjectModel('PharmacyAllocation') private readonly allocations: Model<any>,
    @InjectModel('PharmacyBroadcast') private readonly broadcasts: Model<any>,
    @InjectModel('PharmacyInventoryItem') private readonly inventory: Model<any>,
  ) {}

  private offerExpiry(): Date {
    const configuredSeconds = Number(process.env.PHARMACY_OFFER_TTL_SECONDS ?? 720);
    const ttlSeconds = Number.isFinite(configuredSeconds) ? Math.min(3600, Math.max(60, configuredSeconds)) : 720;
    return new Date(Date.now() + ttlSeconds * 1000);
  }

  async listPatientOffers(user: any, orderId: string) {
    const order = await this.ownedOrder(user, orderId);
    const now = new Date();
    await this.offers.updateMany({ order_id: order.id, status: 'open', expires_at: { $lt: now } }, { $set: { status: 'expired' } });
    return this.offers.find({ order_id: order.id, patient_account_id: user.id, status: { $in: ['open', 'selected'] }, expires_at: { $gte: now } }).sort({ 'totals.total': 1, preparation_minutes: 1 }).lean();
  }

  async submitOffer(user: any, orderId: string, body: SubmitPharmacyOfferDto) {
    if (!isProviderRole(user?.role)) throw new ForbiddenException('provider_scope_required');
    const order = await this.orders.findOne({ id: orderId });
    if (!order) throw new NotFoundException('order_not_found');
    const isSelectedNegotiation = order.governed_state === GovernedPharmacyOrderState.NEGOTIATION_REQUIRED
      && order.selected_pharmacy_account_id === user.id;
    if (![PharmacyOrderState.BROADCASTING, PharmacyOrderState.AWAITING_FULL_ACCEPTANCE, PharmacyOrderState.NEGOTIATING_SUBSTITUTES].includes(order.status) && !isSelectedNegotiation) {
      throw new BadRequestException(`offer_not_allowed_in_${order.status}`);
    }
    const submitted = body?.items ?? [];
    if (!submitted.length) throw new BadRequestException('offer_items_required');
    if (new Set(submitted.map((line) => line.order_item_id)).size !== submitted.length) throw new BadRequestException('duplicate_order_item');

    const quotedLines: any[] = [];
    for (const requested of order.items) {
      const line = submitted.find((candidate) => candidate.order_item_id === requested.id);
      if (!line) {
        quotedLines.push({ order_item_id: requested.id, requested_qty: requested.qty, offered_qty: 0, available: false, unit_price: 0 });
        continue;
      }
      const quantity = Math.max(0, Math.min(Number(line.offered_qty ?? requested.qty), Number(requested.qty)));
      const stock: any = line.inventory_id
        ? await this.inventory.findOne({ id: line.inventory_id, provider_account_id: user.id }).lean()
        : await this.inventory.findOne({ provider_account_id: user.id, sku: requested.matched_sku }).lean();
      const available = Boolean(stock && Number(stock.stock) >= quantity && quantity > 0);
      quotedLines.push({
        order_item_id: requested.id,
        inventory_id: stock?.id,
        sku: stock?.sku ?? requested.matched_sku,
        name: stock?.name_ar ?? stock?.name_en ?? requested.name_ar ?? requested.name_en,
        requested_qty: requested.qty,
        offered_qty: available ? quantity : 0,
        available,
        unit_price: available ? Number(stock.price) : 0,
        alternative: line.alternative,
      });
    }
    if (!quotedLines.some((line) => line.available)) throw new BadRequestException('offer_has_no_available_items');
    const totals = calculatePharmacyQuote(quotedLines, Number(body.delivery_fee ?? 0));
    const existing = await this.offers.findOne({
      order_id: order.id,
      pharmacy_account_id: user.id,
      status: isSelectedNegotiation ? { $in: ['selected', 'final_quote_ready'] } : 'open',
    });
    const revision = (existing?.revision ?? 0) + 1;
    const snapshot = { items: quotedLines, totals, fulfillment: body.fulfillment ?? 'pharmacy_delivery', cod_allowed: Boolean(body.cod_allowed), insurance_ready: Boolean(body.insurance_ready), revision };
    const snapshotHash = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
    const expiresAt = this.offerExpiry();
    const offer = existing ?? new this.offers({ id: uuidv4(), order_id: order.id, patient_account_id: order.patient_account_id, pharmacy_account_id: user.id });
    Object.assign(offer, { ...snapshot, snapshot_hash: snapshotHash, expires_at: expiresAt, status: isSelectedNegotiation ? 'final_quote_ready' : 'open' });
    offer.timeline = [...(offer.timeline ?? []), { ts: new Date(), event: 'submitted_or_revised', by: user.id, meta: { revision } }];
    await offer.save();

    if (isSelectedNegotiation) {
      assertGovernedPharmacyTransition(
        GovernedPharmacyOrderState.NEGOTIATION_REQUIRED,
        GovernedPharmacyOrderState.FINAL_QUOTE_READY,
        'PHARMACY',
        { quoteHash: snapshotHash, quoteRevision: revision },
      );
      order.governed_state = GovernedPharmacyOrderState.FINAL_QUOTE_READY;
      order.pending_final_quote_snapshot = { ...snapshot, snapshot_hash: snapshotHash };
      order.pending_final_quote_hash = snapshotHash;
      order.pending_final_quote_revision = revision;
      order.timeline.push({ ts: new Date(), event: 'pharmacy_submitted_final_quote', by: user.id, meta: { offer_id: offer.id, revision, snapshot_hash: snapshotHash } });
      await order.save();
      return offer.toObject();
    }

    const broadcast = await this.broadcasts.findOne({ order_id: order.id });
    if (broadcast) {
      broadcast.responses = (broadcast.responses ?? []).filter((response: any) => response.pharmacy_account_id !== user.id);
      broadcast.responses.push({ pharmacy_account_id: user.id, pharmacy_name: user.name_ar || user.name || 'Pharmacy', response: quotedLines.every((line) => line.available) ? 'have_all' : 'partial', items: quotedLines.map((line) => ({ order_item_id: line.order_item_id, have: line.available ? (line.alternative ? 'alternative' : 'yes') : 'no', qty_available: line.offered_qty, unit_price: line.unit_price, alternative: line.alternative })), eta_minutes: body.preparation_minutes, delivery_fee: totals.delivery_fee, responded_at: new Date() });
      await broadcast.save();
    }
    if (order.status === PharmacyOrderState.BROADCASTING) {
      assertGovernedPharmacyTransition(
        order.governed_state ?? GovernedPharmacyOrderState.ORDER_BROADCASTING,
        GovernedPharmacyOrderState.OFFERS_READY,
        'SYSTEM',
      );
      order.status = PharmacyOrderState.AWAITING_FULL_ACCEPTANCE;
      order.governed_state = GovernedPharmacyOrderState.OFFERS_READY;
      order.timeline.push({ ts: new Date(), event: 'offers_available', meta: { offer_id: offer.id } });
      await order.save();
    }
    return offer.toObject();
  }

  async selectOffer(user: any, orderId: string, offerId: string, coverageMode: 'cash' | 'insurance') {
    const order = await this.ownedOrder(user, orderId);
    if (order.selected_offer_id) {
      if (order.selected_offer_id === offerId) return this.offers.findOne({ id: offerId }).lean();
      throw new BadRequestException('another_offer_already_selected');
    }
    const offer: any = await this.offers.findOne({ id: offerId, order_id: order.id, patient_account_id: user.id, status: 'open', expires_at: { $gte: new Date() } }).lean();
    if (!offer) throw new NotFoundException('active_offer_not_found');
    if (coverageMode === 'insurance' && !offer.insurance_ready) throw new BadRequestException('offer_not_insurance_ready');
    const governedState = order.governed_state ?? GovernedPharmacyOrderState.OFFERS_READY;
    assertGovernedPharmacyTransition(governedState, GovernedPharmacyOrderState.OFFER_SELECTED, 'PATIENT', { offerId: offer.id });
    const negotiationRequired = offer.items.some((item: any) => !item.available || Boolean(item.alternative));

    const locked: any = await this.orders.findOneAndUpdate(
      { id: order.id, selected_offer_id: { $exists: false }, $or: [{ governed_state: governedState }, { governed_state: { $exists: false } }] },
      { $set: { selected_offer_id: offer.id, selected_pharmacy_account_id: offer.pharmacy_account_id, coverage_mode: coverageMode, negotiation_required: negotiationRequired, selected_offer_snapshot: { items: offer.items, totals: offer.totals, snapshot_hash: offer.snapshot_hash }, selected_offer_hash: offer.snapshot_hash, selected_offer_revision: offer.revision, governed_state: GovernedPharmacyOrderState.OFFER_SELECTED, status: negotiationRequired ? PharmacyOrderState.NEGOTIATING_SUBSTITUTES : PharmacyOrderState.FULLY_ALLOCATED }, $push: { timeline: { ts: new Date(), event: 'patient_selected_offer', by: user.id, meta: { offer_id: offer.id, coverage_mode: coverageMode, snapshot_hash: offer.snapshot_hash, negotiation_required: negotiationRequired } } } },
      { new: true },
    );
    if (!locked) throw new BadRequestException('offer_selection_locked');

    const reserved: any[] = [];
    try {
      for (const line of offer.items.filter((item: any) => item.available)) {
        const result = await this.inventory.updateOne({ id: line.inventory_id, provider_account_id: offer.pharmacy_account_id, stock: { $gte: line.offered_qty } }, { $inc: { stock: -line.offered_qty } });
        if (result.modifiedCount !== 1) throw new BadRequestException(`inventory_changed:${line.order_item_id}`);
        reserved.push(line);
      }
      await this.offers.updateOne({ id: offer.id, status: 'open' }, { $set: { status: 'selected' }, $push: { timeline: { ts: new Date(), event: 'selected_by_patient', by: user.id } } });
      await this.offers.updateMany({ order_id: order.id, id: { $ne: offer.id }, status: 'open' }, { $set: { status: 'superseded' } });
      const allocation: any = await this.allocations.create({ id: uuidv4(), order_id: order.id, pharmacy_account_id: offer.pharmacy_account_id, status: PharmacyAllocationState.PENDING_REVIEW, items: offer.items.map((line: any) => ({ id: uuidv4(), order_item_id: line.order_item_id, inventory_id: line.inventory_id, sku: line.sku, name: line.name, action: line.available ? 'available' : 'unavailable', qty_requested: line.requested_qty, qty_offered: line.offered_qty, unit_price: line.unit_price })), totals: offer.totals, timeline: [{ ts: new Date(), event: 'selected_offer_snapshot', meta: { offer_id: offer.id, revision: offer.revision } }] });
      await this.orders.updateOne({ id: order.id }, { $set: { allocations: [allocation.id], insurance_status: coverageMode === 'insurance' ? 'authorization_pending' : undefined } });
      return { offer, allocation: allocation.toObject(), final_quote_acceptance_required: true, payment_required: false, insurance_authorization_required: false };
    } catch (error) {
      for (const line of reserved) await this.inventory.updateOne({ id: line.inventory_id, provider_account_id: offer.pharmacy_account_id }, { $inc: { stock: line.offered_qty } });
      await this.orders.updateOne({ id: order.id, selected_offer_id: offer.id }, { $unset: { selected_offer_id: 1, selected_pharmacy_account_id: 1, coverage_mode: 1, negotiation_required: 1, selected_offer_snapshot: 1, selected_offer_hash: 1, selected_offer_revision: 1, pending_final_quote_snapshot: 1, pending_final_quote_hash: 1, pending_final_quote_revision: 1, accepted_quote_snapshot: 1, accepted_quote_hash: 1, accepted_quote_revision: 1 }, $set: { status: PharmacyOrderState.AWAITING_FULL_ACCEPTANCE, governed_state: GovernedPharmacyOrderState.OFFERS_READY } });
      throw error;
    }
  }

  async acceptFinalQuote(user: any, orderId: string, quoteHash: string, quoteRevision: number) {
    const order = await this.ownedOrder(user, orderId);
    const current = order.governed_state as GovernedPharmacyOrderState;
    const source = current === GovernedPharmacyOrderState.FINAL_QUOTE_READY
      ? { snapshot: order.pending_final_quote_snapshot, hash: order.pending_final_quote_hash, revision: order.pending_final_quote_revision }
      : current === GovernedPharmacyOrderState.OFFER_SELECTED && order.negotiation_required === false
        ? { snapshot: order.selected_offer_snapshot, hash: order.selected_offer_hash, revision: order.selected_offer_revision }
        : null;
    if (!source?.snapshot || source.hash !== quoteHash || source.revision !== quoteRevision) throw new BadRequestException('final_quote_mismatch');
    const finalState = order.coverage_mode === 'insurance'
      ? GovernedPharmacyOrderState.INSURANCE_PROCESSING
      : GovernedPharmacyOrderState.FINAL_QUOTE_ACCEPTED;
    if (current === GovernedPharmacyOrderState.FINAL_QUOTE_READY) {
      assertGovernedPharmacyTransition(current, GovernedPharmacyOrderState.FINAL_QUOTE_ACCEPTED, 'PATIENT', { quoteHash, quoteRevision });
    } else {
      assertGovernedPharmacyTransition(current, GovernedPharmacyOrderState.FINAL_QUOTE_ACCEPTED, 'PATIENT', { negotiationRequired: false, quoteHash, quoteRevision });
    }
    if (finalState === GovernedPharmacyOrderState.INSURANCE_PROCESSING) {
      assertGovernedPharmacyTransition(GovernedPharmacyOrderState.FINAL_QUOTE_ACCEPTED, finalState, 'SYSTEM', { hasPolicy: Boolean(order.insurance_details), insuranceReady: Boolean(source.snapshot.insurance_ready) });
    }
    const updated: any = await this.orders.findOneAndUpdate(
      { id: order.id, patient_account_id: user.id, governed_state: current },
      { $set: { governed_state: finalState, accepted_quote_snapshot: source.snapshot, accepted_quote_hash: source.hash, accepted_quote_revision: source.revision, insurance_status: finalState === GovernedPharmacyOrderState.INSURANCE_PROCESSING ? 'authorization_pending' : order.insurance_status }, $push: { timeline: { ts: new Date(), event: 'patient_accepted_final_quote', by: user.id, meta: { quote_hash: quoteHash, quote_revision: quoteRevision, coverage_mode: order.coverage_mode } } } },
      { new: true },
    );
    if (!updated) throw new BadRequestException('final_quote_acceptance_locked');
    return updated.toObject ? updated.toObject() : updated;
  }

  private async ownedOrder(user: any, orderId: string) {
    const order = await this.orders.findOne({ id: orderId });
    if (!order) throw new NotFoundException('order_not_found');
    if (order.patient_account_id !== user?.id) throw new ForbiddenException('not_yours');
    return order;
  }
}
