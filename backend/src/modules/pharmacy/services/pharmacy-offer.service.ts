import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { isProviderRole } from '../../../common/enums';
import { PharmacyAllocationState, PharmacyOrderState } from '../schemas/pharmacy.schema';
import { EvaluatePharmacyInsuranceDto, SubmitPharmacyOfferDto } from '../dto/pharmacy-offer.dto';
import { assertGovernedPharmacyTransition } from '../../../common/governed-workflow';
import { PharmacyOrderState as GovernedPharmacyOrderState } from '@nabd/shared-contracts';
import { PharmacyChatService } from './pharmacy-chat.service';

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
    private readonly chats?: PharmacyChatService,
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
    const selectionStartedAt = new Date();
    const offer: any = await this.offers.findOne({ id: offerId, order_id: order.id, patient_account_id: user.id, status: 'open', expires_at: { $gte: selectionStartedAt } }).lean();
    if (!offer) throw new NotFoundException('active_offer_not_found');
    if (coverageMode === 'insurance' && !offer.insurance_ready) throw new BadRequestException('offer_not_insurance_ready');
    const claim = await this.offers.updateOne(
      { id: offer.id, status: 'open', expires_at: { $gte: selectionStartedAt }, $or: [{ selection_lock_until: { $exists: false } }, { selection_lock_until: { $lte: selectionStartedAt } }] },
      { $set: { status: 'selection_pending', selection_lock_until: new Date(selectionStartedAt.getTime() + 60_000) }, $push: { timeline: { ts: selectionStartedAt, event: 'patient_selection_claimed', by: user.id } } },
    );
    if (claim?.modifiedCount !== undefined && claim.modifiedCount !== 1) throw new BadRequestException('offer_selection_claim_unavailable');
    const governedState = order.governed_state ?? GovernedPharmacyOrderState.OFFERS_READY;
    assertGovernedPharmacyTransition(governedState, GovernedPharmacyOrderState.OFFER_SELECTED, 'PATIENT', { offerId: offer.id });
    const negotiationRequired = offer.items.some((item: any) => !item.available || Boolean(item.alternative));

    const locked: any = await this.orders.findOneAndUpdate(
      { id: order.id, selected_offer_id: { $exists: false }, $or: [{ governed_state: governedState }, { governed_state: { $exists: false } }] },
      { $set: { selected_offer_id: offer.id, selected_pharmacy_account_id: offer.pharmacy_account_id, coverage_mode: coverageMode, negotiation_required: negotiationRequired, selected_offer_snapshot: { items: offer.items, totals: offer.totals, snapshot_hash: offer.snapshot_hash }, selected_offer_hash: offer.snapshot_hash, selected_offer_revision: offer.revision, governed_state: GovernedPharmacyOrderState.OFFER_SELECTED, status: negotiationRequired ? PharmacyOrderState.NEGOTIATING_SUBSTITUTES : PharmacyOrderState.FULLY_ALLOCATED }, $push: { timeline: { ts: new Date(), event: 'patient_selected_offer', by: user.id, meta: { offer_id: offer.id, coverage_mode: coverageMode, snapshot_hash: offer.snapshot_hash, negotiation_required: negotiationRequired } } } },
      { new: true },
    );
    if (!locked) {
      await this.offers.updateOne({ id: offer.id, status: 'selection_pending' }, { $set: { status: 'open', selection_lock_until: undefined } });
      throw new BadRequestException('offer_selection_locked');
    }

    const reserved: any[] = [];
    try {
      for (const line of offer.items.filter((item: any) => item.available)) {
        const result = await this.inventory.updateOne({ id: line.inventory_id, provider_account_id: offer.pharmacy_account_id, stock: { $gte: line.offered_qty } }, { $inc: { stock: -line.offered_qty } });
        if (result.modifiedCount !== 1) throw new BadRequestException(`inventory_changed:${line.order_item_id}`);
        reserved.push(line);
      }
      await this.offers.updateOne({ id: offer.id, status: 'selection_pending' }, { $set: { status: 'selected', selection_lock_until: undefined }, $push: { timeline: { ts: new Date(), event: 'selected_by_patient', by: user.id } } });
      await this.offers.updateMany({ order_id: order.id, id: { $ne: offer.id }, status: 'open' }, { $set: { status: 'superseded' } });
      const allocation: any = await this.allocations.create({ id: uuidv4(), order_id: order.id, pharmacy_account_id: offer.pharmacy_account_id, status: PharmacyAllocationState.PENDING_REVIEW, items: offer.items.map((line: any) => ({ id: uuidv4(), order_item_id: line.order_item_id, inventory_id: line.inventory_id, sku: line.sku, name: line.name, action: line.available ? 'available' : 'unavailable', qty_requested: line.requested_qty, qty_offered: line.offered_qty, unit_price: line.unit_price })), totals: offer.totals, timeline: [{ ts: new Date(), event: 'selected_offer_snapshot', meta: { offer_id: offer.id, revision: offer.revision } }] });
      await this.orders.updateOne({ id: order.id }, { $set: { allocations: [allocation.id], insurance_status: coverageMode === 'insurance' ? 'authorization_pending' : undefined } });
      const negotiationThreads: string[] = [];
      if (negotiationRequired) {
        assertGovernedPharmacyTransition(
          GovernedPharmacyOrderState.OFFER_SELECTED,
          GovernedPharmacyOrderState.NEGOTIATION_REQUIRED,
          'SYSTEM',
          { negotiationRequired: true },
        );
        const transitioned = await this.orders.updateOne(
          { id: order.id, selected_offer_id: offer.id, governed_state: GovernedPharmacyOrderState.OFFER_SELECTED },
          { $set: { governed_state: GovernedPharmacyOrderState.NEGOTIATION_REQUIRED }, $push: { timeline: { ts: new Date(), event: 'negotiation_required', meta: { offer_id: offer.id } } } },
        );
        if (transitioned?.modifiedCount !== undefined && transitioned.modifiedCount !== 1) throw new BadRequestException('negotiation_transition_locked');
        for (const line of offer.items.filter((item: any) => !item.available || Boolean(item.alternative))) {
          const thread = await this.chats?.openOrGetThread(order.id, line.order_item_id, offer.pharmacy_account_id);
          if (thread?.id) negotiationThreads.push(thread.id);
        }
      }
      return { offer, allocation: allocation.toObject(), final_quote_acceptance_required: !negotiationRequired, negotiation_required: negotiationRequired, negotiation_thread_ids: negotiationThreads, payment_required: false, insurance_authorization_required: false };
    } catch (error) {
      for (const line of reserved) await this.inventory.updateOne({ id: line.inventory_id, provider_account_id: offer.pharmacy_account_id }, { $inc: { stock: line.offered_qty } });
      await this.orders.updateOne({ id: order.id, selected_offer_id: offer.id }, { $unset: { selected_offer_id: 1, selected_pharmacy_account_id: 1, coverage_mode: 1, negotiation_required: 1, selected_offer_snapshot: 1, selected_offer_hash: 1, selected_offer_revision: 1, pending_final_quote_snapshot: 1, pending_final_quote_hash: 1, pending_final_quote_revision: 1, accepted_quote_snapshot: 1, accepted_quote_hash: 1, accepted_quote_revision: 1 }, $set: { status: PharmacyOrderState.AWAITING_FULL_ACCEPTANCE, governed_state: GovernedPharmacyOrderState.OFFERS_READY } });
      await this.offers.updateOne({ id: offer.id, status: 'selection_pending' }, { $set: { status: 'open', selection_lock_until: undefined } });
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

  async recordInsuranceDecision(user: any, orderId: string, body: EvaluatePharmacyInsuranceDto) {
    if (!isProviderRole(user?.role)) throw new ForbiddenException('provider_scope_required');
    const order: any = await this.orders.findOne({ id: orderId });
    if (!order) throw new NotFoundException('order_not_found');
    if (order.selected_pharmacy_account_id !== user.id) throw new ForbiddenException('not_selected_pharmacy');
    if (order.governed_state !== GovernedPharmacyOrderState.INSURANCE_PROCESSING) throw new BadRequestException('insurance_decision_not_allowed');
    if (!order.insurance_details || !order.accepted_quote_snapshot) throw new BadRequestException('insurance_or_accepted_quote_missing');

    const quoteItems = order.accepted_quote_snapshot.items ?? [];
    const submitted = body.items ?? [];
    if (new Set(submitted.map((item) => item.order_item_id)).size !== submitted.length) throw new BadRequestException('duplicate_insurance_item_decision');
    if (submitted.length !== quoteItems.length || quoteItems.some((line: any) => !submitted.some((item) => item.order_item_id === line.order_item_id))) {
      throw new BadRequestException('incomplete_insurance_item_decisions');
    }

    const decisions = submitted.map((item) => {
      const line = quoteItems.find((candidate: any) => candidate.order_item_id === item.order_item_id);
      const lineAmount = Math.round(Number(line?.offered_qty ?? 0) * Number(line?.unit_price ?? 0) * 100) / 100;
      const coveredAmount = Math.round(Number(item.covered_amount) * 100) / 100;
      const coPayAmount = Math.round(Number(item.co_pay_amount) * 100) / 100;
      if (!Number.isFinite(coveredAmount) || !Number.isFinite(coPayAmount) || coveredAmount < 0 || coPayAmount < 0 || coveredAmount + coPayAmount > lineAmount) {
        throw new BadRequestException(`invalid_insurance_amount:${item.order_item_id}`);
      }
      if (item.decision === 'APPROVED_FULL' && coPayAmount !== 0) throw new BadRequestException(`full_approval_has_copay:${item.order_item_id}`);
      if (item.decision === 'REJECTED' && coveredAmount !== 0) throw new BadRequestException(`rejected_item_has_coverage:${item.order_item_id}`);
      return { ...item, covered_amount: coveredAmount, co_pay_amount: coPayAmount, line_amount: lineAmount };
    });
    const summaryDecision = decisions.every((item) => item.decision === 'APPROVED_FULL')
      ? 'APPROVED_FULL'
      : decisions.every((item) => item.decision === 'REJECTED')
        ? 'REJECTED'
        : 'APPROVED_PARTIAL';
    const coPayAmount = Math.round(decisions.reduce((sum, item) => sum + item.co_pay_amount, 0) * 100) / 100;
    const coveredAmount = Math.round(decisions.reduce((sum, item) => sum + item.covered_amount, 0) * 100) / 100;
    assertGovernedPharmacyTransition(
      GovernedPharmacyOrderState.INSURANCE_PROCESSING,
      GovernedPharmacyOrderState.INSURANCE_DECISION_READY,
      'PHARMACY',
      { insuranceItemsDecided: true, decision: summaryDecision },
    );
    const isFullyCovered = summaryDecision === 'APPROVED_FULL' && coPayAmount === 0;
    if (isFullyCovered) {
      assertGovernedPharmacyTransition(
        GovernedPharmacyOrderState.INSURANCE_DECISION_READY,
        GovernedPharmacyOrderState.CONFIRMED,
        'SYSTEM',
        { decision: summaryDecision, coPayAmount },
      );
    }
    const updated: any = await this.orders.findOneAndUpdate(
      { id: order.id, selected_pharmacy_account_id: user.id, governed_state: GovernedPharmacyOrderState.INSURANCE_PROCESSING },
      {
        $set: {
          governed_state: isFullyCovered ? GovernedPharmacyOrderState.CONFIRMED : GovernedPharmacyOrderState.INSURANCE_DECISION_READY,
          insurance_item_decisions: decisions,
          insurance_decision_summary: { decision: summaryDecision, co_pay_amount: coPayAmount, covered_amount: coveredAmount, decided_at: new Date(), decided_by: user.id },
          insurance_status: summaryDecision,
          payment_status: isFullyCovered ? 'covered_by_insurance' : undefined,
        },
        $push: { timeline: { ts: new Date(), event: isFullyCovered ? 'insurance_fully_covered_confirmed' : 'pharmacy_insurance_items_decided', by: user.id, meta: { decision: summaryDecision, co_pay_amount: coPayAmount, covered_amount: coveredAmount } } },
      },
      { new: true },
    );
    if (!updated) throw new BadRequestException('insurance_decision_locked');
    return updated.toObject ? updated.toObject() : updated;
  }

  async acceptInsuranceCoPay(user: any, orderId: string, paymentMethod: 'card' | 'apple-pay' | 'google-pay') {
    const order = await this.ownedOrder(user, orderId);
    const summary = order.insurance_decision_summary;
    if (order.governed_state !== GovernedPharmacyOrderState.INSURANCE_DECISION_READY || !['APPROVED_FULL', 'APPROVED_PARTIAL'].includes(summary?.decision)) {
      throw new BadRequestException('insurance_copay_not_available');
    }
    const coPayAmount = Number(summary.co_pay_amount);
    if (!Number.isFinite(coPayAmount) || coPayAmount <= 0) throw new BadRequestException('no_payable_insurance_copay');
    assertGovernedPharmacyTransition(
      GovernedPharmacyOrderState.INSURANCE_DECISION_READY,
      GovernedPharmacyOrderState.CO_PAY_PENDING,
      'PATIENT',
      { decision: summary.decision, coPayAccepted: true, coPayAmount },
    );
    const updated: any = await this.orders.findOneAndUpdate(
      { id: order.id, patient_account_id: user.id, governed_state: GovernedPharmacyOrderState.INSURANCE_DECISION_READY },
      { $set: { governed_state: GovernedPharmacyOrderState.CO_PAY_PENDING, payment_method: paymentMethod }, $push: { timeline: { ts: new Date(), event: 'patient_accepted_insurance_copay', by: user.id, meta: { co_pay_amount: coPayAmount, payment_method: paymentMethod } } } },
      { new: true },
    );
    if (!updated) throw new BadRequestException('insurance_copay_acceptance_locked');
    return updated.toObject ? updated.toObject() : updated;
  }

  async acceptInsuranceSelfPay(user: any, orderId: string, paymentMethod: 'card' | 'apple-pay' | 'google-pay') {
    const order = await this.ownedOrder(user, orderId);
    const summary = order.insurance_decision_summary;
    if (order.governed_state !== GovernedPharmacyOrderState.INSURANCE_DECISION_READY || !['APPROVED_PARTIAL', 'REJECTED'].includes(summary?.decision)) {
      throw new BadRequestException('insurance_self_pay_not_available');
    }
    const originalSnapshot = order.accepted_quote_snapshot;
    const originalTotal = Number(originalSnapshot?.totals?.total);
    const coveredAmount = Number(summary.covered_amount);
    if (!originalSnapshot || !Number.isFinite(originalTotal) || !Number.isFinite(coveredAmount) || coveredAmount < 0 || coveredAmount >= originalTotal) {
      throw new BadRequestException('invalid_insurance_self_pay_amount');
    }
    const selfPayAmount = Math.round((originalTotal - coveredAmount) * 100) / 100;
    const quoteRevision = Number(order.accepted_quote_revision) + 1;
    const selfPaySnapshot = {
      ...originalSnapshot,
      totals: { subtotal: selfPayAmount, delivery_fee: 0, total: selfPayAmount, currency: originalSnapshot.totals.currency },
      insurance_self_pay: { source_quote_hash: order.accepted_quote_hash, source_quote_revision: order.accepted_quote_revision, covered_amount: coveredAmount, patient_liability: selfPayAmount },
      revision: quoteRevision,
    };
    const quoteHash = createHash('sha256').update(JSON.stringify(selfPaySnapshot)).digest('hex');
    assertGovernedPharmacyTransition(
      GovernedPharmacyOrderState.INSURANCE_DECISION_READY,
      GovernedPharmacyOrderState.SELF_PAY_SELECTION,
      'PATIENT',
      { decision: summary.decision, selfPayAccepted: true, quoteHash, quoteRevision },
    );
    assertGovernedPharmacyTransition(
      GovernedPharmacyOrderState.SELF_PAY_SELECTION,
      GovernedPharmacyOrderState.FINAL_QUOTE_ACCEPTED,
      'PATIENT',
      { quoteHash, quoteRevision },
    );
    const updated: any = await this.orders.findOneAndUpdate(
      { id: order.id, patient_account_id: user.id, governed_state: GovernedPharmacyOrderState.INSURANCE_DECISION_READY },
      { $set: { governed_state: GovernedPharmacyOrderState.FINAL_QUOTE_ACCEPTED, accepted_quote_snapshot: selfPaySnapshot, accepted_quote_hash: quoteHash, accepted_quote_revision: quoteRevision, payment_method: paymentMethod }, $push: { timeline: { ts: new Date(), event: 'patient_accepted_insurance_self_pay', by: user.id, meta: { source_quote_hash: order.accepted_quote_hash, source_quote_revision: order.accepted_quote_revision, covered_amount: coveredAmount, patient_liability: selfPayAmount, payment_method: paymentMethod } } } },
      { new: true },
    );
    if (!updated) throw new BadRequestException('insurance_self_pay_acceptance_locked');
    return updated.toObject ? updated.toObject() : updated;
  }

  async registerCod(user: any, orderId: string) {
    const order = await this.ownedOrder(user, orderId);
    const snapshot = order.accepted_quote_snapshot;
    const amount = Number(snapshot?.totals?.total);
    const currency = String(snapshot?.totals?.currency ?? '').toUpperCase();
    if (order.coverage_mode !== 'cash' || order.governed_state !== GovernedPharmacyOrderState.FINAL_QUOTE_ACCEPTED) {
      throw new BadRequestException('cod_not_available_for_order');
    }
    if (snapshot?.cod_allowed !== true || !order.accepted_quote_hash || !Number.isInteger(order.accepted_quote_revision) || !Number.isFinite(amount) || amount <= 0 || currency !== 'SAR') {
      throw new BadRequestException('cod_not_eligible');
    }
    assertGovernedPharmacyTransition(
      GovernedPharmacyOrderState.FINAL_QUOTE_ACCEPTED,
      GovernedPharmacyOrderState.COD_REGISTERED,
      'PATIENT',
      { paymentMethod: 'COD', codAllowed: true, codRegistered: true, quoteHash: order.accepted_quote_hash, quoteRevision: order.accepted_quote_revision },
    );
    assertGovernedPharmacyTransition(
      GovernedPharmacyOrderState.COD_REGISTERED,
      GovernedPharmacyOrderState.CONFIRMED,
      'SYSTEM',
      { codRegistered: true },
    );
    const updated: any = await this.orders.findOneAndUpdate(
      { id: order.id, patient_account_id: user.id, governed_state: GovernedPharmacyOrderState.FINAL_QUOTE_ACCEPTED, coverage_mode: 'cash' },
      {
        $set: {
          governed_state: GovernedPharmacyOrderState.CONFIRMED,
          payment_method: 'cod',
          payment_status: 'cod_pending_collection',
          cod_commitment: { registered_at: new Date(), amount, currency, quote_hash: order.accepted_quote_hash, quote_revision: order.accepted_quote_revision },
        },
        $push: { timeline: { ts: new Date(), event: 'patient_registered_cod', by: user.id, meta: { amount, currency, quote_hash: order.accepted_quote_hash, quote_revision: order.accepted_quote_revision } } },
      },
      { new: true },
    );
    if (!updated) throw new BadRequestException('cod_registration_locked');
    return updated.toObject ? updated.toObject() : updated;
  }

  private async ownedOrder(user: any, orderId: string) {
    const order = await this.orders.findOne({ id: orderId });
    if (!order) throw new NotFoundException('order_not_found');
    if (order.patient_account_id !== user?.id) throw new ForbiddenException('not_yours');
    return order;
  }
}
