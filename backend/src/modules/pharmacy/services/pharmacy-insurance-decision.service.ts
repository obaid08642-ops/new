import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { PharmacyAllocationState, PharmacyOrderState } from '../schemas/pharmacy.schema';

const ACTIVE_PHARMACY_STATUSES = ['approved', 'active'];
const ITEM_OUTCOMES = new Set(['approved', 'partial', 'rejected']);

/**
 * The selected pharmacy records a reviewed insurance result. Client monetary
 * values and a client-selected global outcome are intentionally ignored; the
 * server derives shares/outcome from the immutable selected offer and quantities.
 */
@Injectable()
export class PharmacyInsuranceDecisionService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel('PharmacyOrder') private readonly orders: Model<any>,
    @InjectModel('PharmacyOffer') private readonly offers: Model<any>,
    @InjectModel('PharmacyAllocation') private readonly allocations: Model<any>,
    @InjectModel('PharmacyInventoryItem') private readonly inventory: Model<any>,
    @InjectModel('ProviderAccount') private readonly accounts: Model<any>,
  ) {}

  private async assertSelectedPharmacy(user: any, order: any, session?: any) {
    if (!user?.id) throw new ForbiddenException('pharmacy_identity_required');
    const account: any = await (this.accounts.findOne({ id: user.id, provider_type: 'pharmacy', status: { $in: ACTIVE_PHARMACY_STATUSES } }) as any).session(session || null).lean();
    if (!account) throw new ForbiddenException('approved_active_pharmacy_required');
    if (!order.selected_offer_id || !order.selected_allocation_id || !order.selected_offer_version) throw new BadRequestException('selected_offer_binding_required');
    const [offer, allocation] = await Promise.all([
      (this.offers.findOne({ id: order.selected_offer_id, order_id: order.id, pharmacy_account_id: user.id, version: order.selected_offer_version, status: 'selected' }) as any).session(session || null).lean(),
      (this.allocations.findOne({ id: order.selected_allocation_id, order_id: order.id, pharmacy_account_id: user.id, offer_id: order.selected_offer_id, offer_version: order.selected_offer_version }) as any).session(session || null).lean(),
    ]);
    if (!offer || !allocation || offer.pharmacy_account_id !== user.id || allocation.pharmacy_account_id !== user.id) {
      throw new ForbiddenException('selected_pharmacy_resource_relation_required');
    }
    return { account, offer, allocation };
  }

  private modified(result: any) { return Number(result?.modifiedCount ?? result?.nModified ?? result?.n ?? 0) === 1; }

  private async withTransaction(work: (session: any) => Promise<any>) {
    const session = await this.connection.startSession();
    try {
      let result: any;
      await session.withTransaction(async () => { result = await work(session); });
      return result;
    } finally { await session.endSession(); }
  }

  private paymentMethod(order: any) { return String(order.payment_method || order.payment?.method || (order.insurance_details ? 'insurance' : '')).toLowerCase(); }

  async decide(pharmacy: any, orderId: string, body: any) {
    const idempotencyKey = String(body?.idempotency_key || '').trim();
    const approvalReference = String(body?.approval_reference || '').trim();
    if (!/^[A-Za-z0-9._:-]{16,128}$/.test(idempotencyKey)) throw new BadRequestException('idempotency_key_required');
    if (!approvalReference || approvalReference.length > 160) throw new BadRequestException('approval_reference_required');

    return this.withTransaction(async (session) => {
      const order: any = await (this.orders.findOne({ id: orderId }) as any).session(session);
      if (!order) throw new NotFoundException('order_not_found');
      if (order.patient_account_id === pharmacy?.id) throw new ForbiddenException('provider_patient_separation_required');
      if (this.paymentMethod(order) !== 'insurance') throw new BadRequestException('order_has_no_insurance');
      if (order.insurance_decision?.idempotency_key === idempotencyKey) return { ok: true, idempotent: true, decision: order.insurance_decision, next_status: order.status };
      if (order.insurance_decision) throw new BadRequestException('insurance_decision_already_recorded');
      const { offer, allocation } = await this.assertSelectedPharmacy(pharmacy, order, session);
      if (![PharmacyAllocationState.PENDING_REVIEW, PharmacyAllocationState.PARTIALLY_CONFIRMED].includes(allocation.status)) throw new BadRequestException('insurance_decision_not_allowed_after_fulfillment');

      const supplied = Array.isArray(body?.items) ? body.items : [];
      const byOrderItem = new Map(supplied.map((item: any) => [String(item?.order_item_id || ''), item]));
      if (byOrderItem.size !== offer.items.length || offer.items.some((item: any) => !byOrderItem.has(String(item.order_item_id)))) throw new BadRequestException('per_item_decision_required_for_selected_offer');

      let insurerShare = 0;
      let needsReason = false;
      const itemDecisions = offer.items.map((quoted: any) => {
        const input: any = byOrderItem.get(String(quoted.order_item_id));
        const outcome = String(input?.outcome || '').toLowerCase();
        if (!ITEM_OUTCOMES.has(outcome)) throw new BadRequestException('invalid_per_item_insurance_outcome');
        const quotedQty = Math.max(0, Number(quoted.qty_offered || 0));
        const suppliedQty = Math.max(0, Math.floor(Number(input?.approved_qty ?? (outcome === 'approved' ? quotedQty : 0))));
        const approvedQty = outcome === 'rejected' ? 0 : Math.min(quotedQty, suppliedQty);
        if (outcome === 'approved' && approvedQty !== quotedQty) throw new BadRequestException('approved_item_must_cover_offered_quantity');
        if (outcome === 'partial' && (approvedQty <= 0 || approvedQty >= quotedQty)) throw new BadRequestException('partial_item_requires_partial_approved_quantity');
        const reason = String(input?.reason || '').trim();
        if ((outcome === 'partial' || outcome === 'rejected') && !reason) needsReason = true;
        const insurerAmount = Math.round(Number(quoted.unit_price || 0) * approvedQty * 100) / 100;
        insurerShare += insurerAmount;
        return { order_item_id: quoted.order_item_id, quoted_qty: quotedQty, approved_qty: approvedQty, outcome, reason: reason || null, unit_price: Number(quoted.unit_price || 0), insurer_share: insurerAmount };
      });
      if (needsReason) throw new BadRequestException('partial_or_rejected_item_reason_required');
      const quoteTotal = Math.round(Number(order.pricing_snapshot?.totals?.total ?? offer.totals?.total ?? 0) * 100) / 100;
      if (!Number.isFinite(quoteTotal) || quoteTotal < 0) throw new BadRequestException('selected_quote_snapshot_required');
      insurerShare = Math.round(insurerShare * 100) / 100;
      const patientShare = Math.round(Math.max(0, quoteTotal - insurerShare) * 100) / 100;
      const outcome = patientShare === 0 ? 'full' : insurerShare === 0 ? 'rejected' : 'partial';
      const nextStatus = outcome === 'full' ? PharmacyOrderState.CONFIRMED : outcome === 'partial' ? PharmacyOrderState.WAITING_COPAY : PharmacyOrderState.MANUAL_REVIEW;
      const now = new Date();
      const decision = { outcome, approval_reference: approvalReference, offer_id: offer.id, offer_version: offer.version, allocation_id: allocation.id, quote_total: quoteTotal, insurer_share: insurerShare, patient_share: patientShare, currency: offer.totals?.currency || 'SAR', items: itemDecisions, idempotency_key: idempotencyKey, decided_by: pharmacy.id, decided_at: now };
      const update = await this.orders.updateOne(
        { id: order.id, selected_offer_id: offer.id, selected_offer_version: offer.version, selected_allocation_id: allocation.id, insurance_decision: { $exists: false } },
        { $set: { insurance_decision: decision, status: nextStatus }, $push: { timeline: { ts: now, event: 'pharmacy_insurance_decision_recorded', by: pharmacy.id, meta: { outcome, approval_reference: approvalReference, offer_id: offer.id, offer_version: offer.version, allocation_id: allocation.id } } } }, { session },
      );
      if (!this.modified(update)) throw new BadRequestException('insurance_decision_conflict');
      await this.connection.collection('provider_audit_logs').insertOne({ id: uuidv4(), provider_account_id: pharmacy.id, actor_id: pharmacy.id, actor_role: 'pharmacy', action: 'pharmacy.insurance_decision.recorded', target: { collection: 'pharmacy_orders', id: order.id }, after: { outcome, offer_id: offer.id, offer_version: offer.version, allocation_id: allocation.id }, createdAt: now, updatedAt: now }, { session });
      try {
        await this.connection.collection('domain_outbox').updateOne(
          { aggregate_type: 'pharmacy_order', aggregate_id: order.id, event_type: 'pharmacy.insurance.decision_recorded', idempotency_key: idempotencyKey },
          { $setOnInsert: { aggregate_type: 'pharmacy_order', aggregate_id: order.id, event_type: 'pharmacy.insurance.decision_recorded', idempotency_key: idempotencyKey, payload: { order_id: order.id, patient_account_id: order.patient_account_id, decision }, state: 'pending', created_at: now } }, { upsert: true, session },
        );
      } catch (error: any) {
        if (Number(error?.code) !== 11000) throw error;
      }
      return { ok: true, idempotent: false, decision, next_status: nextStatus };
    });
  }

  /** Patient can explicitly cancel a rejected insurance order; reserved stock is released atomically. */
  async cancelRejectedByPatient(patient: any, orderId: string, idempotencyKey: string) {
    if (!patient?.id) throw new ForbiddenException('patient_identity_required');
    if (!/^[A-Za-z0-9._:-]{16,128}$/.test(String(idempotencyKey || ''))) throw new BadRequestException('idempotency_key_required');
    return this.withTransaction(async (session) => {
      const order: any = await (this.orders.findOne({ id: orderId, patient_account_id: patient.id }) as any).session(session);
      if (!order) throw new NotFoundException('order_not_found');
      if (order.insurance_rejection_cancellation_key === idempotencyKey) return { ok: true, idempotent: true, status: order.status };
      if (order.insurance_decision?.outcome !== 'rejected' || !order.selected_allocation_id || !order.selected_offer_id) throw new BadRequestException('rejected_insurance_decision_required');
      const allocation: any = await (this.allocations.findOne({ id: order.selected_allocation_id, order_id: order.id, offer_id: order.selected_offer_id }) as any).session(session);
      if (!allocation) throw new BadRequestException('selected_allocation_required');
      if (![PharmacyAllocationState.PENDING_REVIEW, PharmacyAllocationState.PARTIALLY_CONFIRMED].includes(allocation.status)) throw new BadRequestException('rejected_order_cancellation_not_allowed_after_fulfillment');
      for (const item of allocation.items || []) {
        if (!item.inventory_id || item.action === 'unavailable' || Number(item.qty_offered || 0) <= 0) continue;
        const release = await this.inventory.updateOne({ id: item.inventory_id, provider_account_id: allocation.pharmacy_account_id }, { $inc: { stock: Number(item.qty_offered) } }, { session });
        if (Number((release as any)?.matchedCount ?? (release as any)?.n ?? 0) !== 1) throw new BadRequestException('reserved_inventory_release_conflict');
      }
      const now = new Date();
      const allocationUpdate = await this.allocations.updateOne({ id: allocation.id, status: allocation.status }, { $set: { status: PharmacyAllocationState.CANCELLED, cancellation_reason: 'patient_cancelled_after_rejected_insurance' }, $push: { timeline: { ts: now, event: 'cancelled_after_rejected_insurance', by: patient.id } } }, { session });
      if (!this.modified(allocationUpdate)) throw new BadRequestException('allocation_cancellation_conflict');
      const orderUpdate = await this.orders.updateOne({ id: order.id, patient_account_id: patient.id, status: PharmacyOrderState.MANUAL_REVIEW }, { $set: { status: PharmacyOrderState.CANCELLED, insurance_rejection_cancellation_key: idempotencyKey }, $push: { timeline: { ts: now, event: 'patient_cancelled_after_rejected_insurance', by: patient.id } } }, { session });
      if (!this.modified(orderUpdate)) throw new BadRequestException('order_cancellation_conflict');
      try {
        await this.connection.collection('domain_outbox').updateOne({ aggregate_type: 'pharmacy_order', aggregate_id: order.id, event_type: 'pharmacy.insurance.rejected_cancelled', idempotency_key: idempotencyKey }, { $setOnInsert: { aggregate_type: 'pharmacy_order', aggregate_id: order.id, event_type: 'pharmacy.insurance.rejected_cancelled', idempotency_key: idempotencyKey, payload: { order_id: order.id, allocation_id: allocation.id, patient_account_id: patient.id }, state: 'pending', created_at: now } }, { upsert: true, session });
      } catch (error: any) {
        if (Number(error?.code) !== 11000) throw error;
      }
      return { ok: true, idempotent: false, status: PharmacyOrderState.CANCELLED };
    });
  }
}
