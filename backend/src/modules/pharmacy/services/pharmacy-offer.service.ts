import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { isProviderRole } from '../../../common/enums';
import { PharmacyAllocationState, PharmacyOrderState } from '../schemas/pharmacy.schema';

type SubmittedLine = { order_item_id: string; inventory_id?: string; offered_qty?: number; alternative?: Record<string, any> };

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

  async listPatientOffers(user: any, orderId: string) {
    const order = await this.ownedOrder(user, orderId);
    const now = new Date();
    await this.offers.updateMany({ order_id: order.id, status: 'open', expires_at: { $lt: now } }, { $set: { status: 'expired' } });
    return this.offers.find({ order_id: order.id, patient_account_id: user.id, status: { $in: ['open', 'selected'] }, expires_at: { $gte: now } }).sort({ 'totals.total': 1, preparation_minutes: 1 }).lean();
  }

  async submitOffer(user: any, orderId: string, body: { items: SubmittedLine[]; delivery_fee?: number; fulfillment?: 'pharmacy_delivery' | 'pickup'; cod_allowed?: boolean; insurance_ready?: boolean; preparation_minutes?: number }) {
    if (!isProviderRole(user?.role)) throw new ForbiddenException('provider_scope_required');
    const order = await this.orders.findOne({ id: orderId });
    if (!order) throw new NotFoundException('order_not_found');
    if (![PharmacyOrderState.BROADCASTING, PharmacyOrderState.AWAITING_FULL_ACCEPTANCE, PharmacyOrderState.NEGOTIATING_SUBSTITUTES].includes(order.status)) {
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
    const existing = await this.offers.findOne({ order_id: order.id, pharmacy_account_id: user.id, status: 'open' });
    const revision = (existing?.revision ?? 0) + 1;
    const snapshot = { items: quotedLines, totals, fulfillment: body.fulfillment ?? 'pharmacy_delivery', cod_allowed: Boolean(body.cod_allowed), insurance_ready: Boolean(body.insurance_ready), revision };
    const snapshotHash = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
    const expiresAt = new Date(Date.now() + 12 * 60_000);
    const offer = existing ?? new this.offers({ id: uuidv4(), order_id: order.id, patient_account_id: order.patient_account_id, pharmacy_account_id: user.id });
    Object.assign(offer, { ...snapshot, snapshot_hash: snapshotHash, expires_at: expiresAt, status: 'open' });
    offer.timeline = [...(offer.timeline ?? []), { ts: new Date(), event: 'submitted_or_revised', by: user.id, meta: { revision } }];
    await offer.save();

    const broadcast = await this.broadcasts.findOne({ order_id: order.id });
    if (broadcast) {
      broadcast.responses = (broadcast.responses ?? []).filter((response: any) => response.pharmacy_account_id !== user.id);
      broadcast.responses.push({ pharmacy_account_id: user.id, pharmacy_name: user.name_ar || user.name || 'Pharmacy', response: quotedLines.every((line) => line.available) ? 'have_all' : 'partial', items: quotedLines.map((line) => ({ order_item_id: line.order_item_id, have: line.available ? (line.alternative ? 'alternative' : 'yes') : 'no', qty_available: line.offered_qty, unit_price: line.unit_price, alternative: line.alternative })), eta_minutes: body.preparation_minutes, delivery_fee: totals.delivery_fee, responded_at: new Date() });
      await broadcast.save();
    }
    if (order.status === PharmacyOrderState.BROADCASTING) {
      order.status = PharmacyOrderState.AWAITING_FULL_ACCEPTANCE;
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

    const locked: any = await this.orders.findOneAndUpdate(
      { id: order.id, selected_offer_id: { $exists: false } },
      { $set: { selected_offer_id: offer.id, selected_pharmacy_account_id: offer.pharmacy_account_id, coverage_mode: coverageMode, accepted_quote_snapshot: { items: offer.items, totals: offer.totals, snapshot_hash: offer.snapshot_hash }, accepted_quote_revision: offer.revision, status: PharmacyOrderState.FULLY_ALLOCATED }, $push: { timeline: { ts: new Date(), event: 'patient_selected_offer', by: user.id, meta: { offer_id: offer.id, coverage_mode: coverageMode, snapshot_hash: offer.snapshot_hash } } } },
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
      const allocation: any = await this.allocations.create({ id: uuidv4(), order_id: order.id, pharmacy_account_id: offer.pharmacy_account_id, status: PharmacyAllocationState.PENDING_REVIEW, items: offer.items.map((line: any) => ({ id: uuidv4(), order_item_id: line.order_item_id, inventory_id: line.inventory_id, sku: line.sku, name: line.name, action: line.available ? 'available' : 'unavailable', qty_requested: line.requested_qty, qty_offered: line.offered_qty, unit_price: line.unit_price })), totals: offer.totals, timeline: [{ ts: new Date(), event: 'accepted_quote_snapshot', meta: { offer_id: offer.id, revision: offer.revision } }] });
      await this.orders.updateOne({ id: order.id }, { $set: { allocations: [allocation.id], insurance_status: coverageMode === 'insurance' ? 'authorization_pending' : undefined } });
      return { offer, allocation: allocation.toObject(), payment_required: coverageMode === 'cash', insurance_authorization_required: coverageMode === 'insurance' };
    } catch (error) {
      for (const line of reserved) await this.inventory.updateOne({ id: line.inventory_id, provider_account_id: offer.pharmacy_account_id }, { $inc: { stock: line.offered_qty } });
      await this.orders.updateOne({ id: order.id, selected_offer_id: offer.id }, { $unset: { selected_offer_id: 1, selected_pharmacy_account_id: 1, coverage_mode: 1, accepted_quote_snapshot: 1, accepted_quote_revision: 1 }, $set: { status: PharmacyOrderState.AWAITING_FULL_ACCEPTANCE } });
      throw error;
    }
  }

  private async ownedOrder(user: any, orderId: string) {
    const order = await this.orders.findOne({ id: orderId });
    if (!order) throw new NotFoundException('order_not_found');
    if (order.patient_account_id !== user?.id) throw new ForbiddenException('not_yours');
    return order;
  }
}
