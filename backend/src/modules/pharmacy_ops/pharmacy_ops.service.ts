import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../../schemas/order.schema';
import { OrdersService } from '../orders/orders.service';
import { UserRole } from '../../common/enums';
import { ServiceState } from '../../common/enums';
import { PharmacyInventory, PharmacyInventoryDocument } from '../../schemas/inventory.schema';
import { Medicine, MedicineDocument } from '../../schemas/medicine.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTS } from '../../common/events';
import { domainStatesFor } from '../workflow-engine/workflow-engine.module';
import { OrderRepository } from "./repositories/order.repository";
import { PharmacyInventoryRepository } from "./repositories/pharmacyinventory.repository";
import { MedicineRepository } from "./repositories/medicine.repository";

/**
 * Pharmacy inbox — reads via universal lifecycle ONLY.
 * Queries the underlying `Order` collection but filters by the set of
 * domain states whose universal mapping matches the requested bucket.
 */
@Injectable()
export class PharmacyOpsService {
  constructor(
    @Inject('OrderRepository') private orderModel: OrderRepository,
    @Inject('PharmacyInventoryRepository') private invModel: PharmacyInventoryRepository,
    @Inject('MedicineRepository') private medModel: MedicineRepository,
    private ordersSvc: OrdersService,
    private events: EventEmitter2,
  ) {}

  private statesFor(universal: ServiceState): string[] {
    return domainStatesFor('pharmacy', universal);
  }

  // ============ Order Queue (engine-state driven) ============
  async incoming(pharmacy: any) {
    return this.orderModel.find({ pharmacy_id: pharmacy.id, state: { $in: this.statesFor(ServiceState.ASSIGNED) } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50);
  }
  async preparing(pharmacy: any) {
    return this.orderModel.find({ pharmacy_id: pharmacy.id, state: { $in: [...this.statesFor(ServiceState.CONFIRMED), ...this.statesFor(ServiceState.IN_PROGRESS)] } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50);
  }
  async ready(pharmacy: any) {
    // "Ready" maps to IN_PROGRESS bucket but specifically items ready for handoff.
    // We narrow to states explicitly representing ready-for-pickup/dispatch.
    return this.orderModel.find({ pharmacy_id: pharmacy.id, state: { $in: ['READY_FOR_DISPATCH', 'READY_FOR_PICKUP'] } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50);
  }
  async completed(pharmacy: any) {
    return this.orderModel.find({ pharmacy_id: pharmacy.id, state: { $in: this.statesFor(ServiceState.COMPLETED) } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50);
  }
  /** Refill orders (chronic-medication reorders) addressed to this pharmacy. */
  async refillOrders(pharmacy: any) {
    return this.orderModel.find(
      { pharmacy_id: pharmacy.id, source: 'refill' },
      { _id: 0, __v: 0 },
    ).sort({ createdAt: -1 }).limit(50);
  }

  /** Basket review: orders currently being edited by pharmacy (no submission yet). */
  async basketReview(pharmacy: any) {
    return this.orderModel.find({
      pharmacy_id: pharmacy.id,
      basket_review_status: { $in: ['none', 'pending_pharmacy_review', 'patient_rejected'] },
      state: { $nin: this.statesFor(ServiceState.COMPLETED).concat(['cancelled', 'CANCELLED']) },
    }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50);
  }
  /** Awaiting patient approval: pharmacy submitted basket, waiting on patient. */
  async awaitingApproval(pharmacy: any) {
    return this.orderModel.find({
      pharmacy_id: pharmacy.id,
      basket_review_status: 'submitted_for_patient_approval',
    }, { _id: 0, __v: 0 }).sort({ basket_submitted_at: -1, createdAt: -1 }).limit(50);
  }

  // ============ Inventory ============
  async getInventory(pharmacy: any) {
    const inv = await this.invModel.find({ pharmacy_id: pharmacy.id }, { _id: 0, __v: 0 });
    if (inv.length === 0) return [];
    const medIds = inv.map((i) => i.medicine_id);
    const meds = await this.medModel.find({ id: { $in: medIds } }, { _id: 0, __v: 0 });
    const medMap = new Map(meds.map((m) => [m.id, m]));
    return inv.map((i) => ({ ...i.toObject(), medicine: medMap.get(i.medicine_id) }));
  }
  async updateStock(pharmacy: any, medicine_id: string, stock_qty: number, is_available = true) {
    const inv = await this.invModel.findOneAndUpdate(
      { pharmacy_id: pharmacy.id, medicine_id },
      { $set: { stock_qty, is_available, last_restocked_at: new Date() } },
      { upsert: true, new: true, projection: { _id: 0, __v: 0 } },
    );
    return inv;
  }
  async addMedicineToInventory(pharmacy: any, body: { medicine_id?: string; name_ar?: string; name_en?: string; active_ingredient?: string; price: number; stock_qty: number; category?: string; requires_prescription?: boolean }) {
    let medId = body.medicine_id;
    if (!medId) {
      if (!body.name_ar) throw new ForbiddenException('name_ar required for new medicine');
      const m = await this.medModel.create({
        name_ar: body.name_ar, name_en: body.name_en, active_ingredient: body.active_ingredient,
        price: body.price, category: body.category || 'medications', verified: false,
        source: 'pharmacy', created_by_user_id: pharmacy.id, created_by_role: UserRole.PHARMACY,
        requires_prescription: !!body.requires_prescription,
      });
      medId = m.id;
      this.events.emit(EVENTS.MEDICINE_PENDING_REVIEW, { medicine_id: medId, by_role: 'pharmacy', by_user_id: pharmacy.id });
    }
    return this.updateStock(pharmacy, medId!, body.stock_qty, true);
  }

  // ============ Per-item Operations ============
  async orderDetail(pharmacy: any, id: string) {
    const o = await this.orderModel.findOne({ id, pharmacy_id: pharmacy.id }, { _id: 0, __v: 0 }).lean();
    if (!o) throw new NotFoundException('order_not_found');
    return o;
  }
  private async loadOrderForEdit(pharmacy: any, id: string) {
    const o = await this.orderModel.findOne({ id, pharmacy_id: pharmacy.id });
    if (!o) throw new NotFoundException('order_not_found');
    return o;
  }
  async markItemUnavailable(pharmacy: any, id: string, idx: number) {
    const o = await this.loadOrderForEdit(pharmacy, id);
    if (!o.items[idx]) throw new NotFoundException('item_not_found');
    o.items[idx].unavailable = true;
    o.markModified('items');
    await o.save();
    this.events.emit('order.item.updated', { order_id: id, idx, change: 'unavailable' });
    return o.toObject();
  }
  async restoreItem(pharmacy: any, id: string, idx: number) {
    const o = await this.loadOrderForEdit(pharmacy, id);
    if (!o.items[idx]) throw new NotFoundException('item_not_found');
    o.items[idx].unavailable = false;
    o.markModified('items');
    await o.save();
    this.events.emit('order.item.updated', { order_id: id, idx, change: 'restored' });
    return o.toObject();
  }
  async updateItemQty(pharmacy: any, id: string, idx: number, qty: number) {
    if (!Number.isFinite(qty) || qty < 1) throw new ForbiddenException('invalid_qty');
    const o = await this.loadOrderForEdit(pharmacy, id);
    if (!o.items[idx]) throw new NotFoundException('item_not_found');
    o.items[idx].qty = qty;
    // Recompute subtotal/total
    o.subtotal = (o.items || []).filter((i: any) => !i.unavailable).reduce((s: number, i: any) => s + (i.price || 0) * (i.qty || 1), 0);
    o.total = o.subtotal + (o.delivery_fee || 0);
    o.markModified('items');
    await o.save();
    this.events.emit('order.item.updated', { order_id: id, idx, change: 'qty', qty });
    return o.toObject();
  }
  async substituteItem(pharmacy: any, id: string, idx: number, body: { name_ar: string; name_en?: string; medicine_id?: string; qty?: number; price?: number; note?: string }) {
    if (!body?.name_ar?.trim()) throw new ForbiddenException('name_required');
    const o = await this.loadOrderForEdit(pharmacy, id);
    if (!o.items[idx]) throw new NotFoundException('item_not_found');
    const orig = o.items[idx];
    o.items[idx] = {
      medicine_id: body.medicine_id || orig.medicine_id,
      name_ar: body.name_ar,
      name_en: body.name_en || orig.name_en,
      qty: body.qty || orig.qty,
      price: body.price != null ? body.price : (orig.price || 0),
      image: orig.image,
      is_manual_entry: orig.is_manual_entry,
      is_substitute: true,
      substituted_from: orig.medicine_id,
      unavailable: false,
    } as any;
    o.subtotal = (o.items || []).filter((i: any) => !i.unavailable).reduce((s: number, i: any) => s + (i.price || 0) * (i.qty || 1), 0);
    o.total = o.subtotal + (o.delivery_fee || 0);
    o.markModified('items');
    await o.save();
    this.events.emit('order.item.updated', { order_id: id, idx, change: 'substituted', note: body.note });
    return o.toObject();
  }

  /** Provider finalizes basket and sends for patient approval (pre-payment). */
  async submitBasket(pharmacy: any, id: string, note?: string) {
    const o = await this.loadOrderForEdit(pharmacy, id);
    if (o.basket_review_status === 'submitted_for_patient_approval') return o.toObject();
    if (!o.pre_review_items || (o.pre_review_items as any[]).length === 0) {
      o.pre_review_items = JSON.parse(JSON.stringify(o.items || []));
      o.pre_review_total = o.total || 0;
    }
    o.subtotal = (o.items || []).filter((i: any) => !i.unavailable).reduce((s: number, i: any) => s + (i.price || 0) * (i.qty || 1), 0);
    o.total = o.subtotal + (o.delivery_fee || 0);
    o.basket_review_status = 'submitted_for_patient_approval';
    o.basket_submitted_at = new Date();
    if (note) o.pharmacy_basket_note = note;
    o.markModified('items');
    o.markModified('pre_review_items');
    await o.save();
    this.events.emit('order.basket.submitted', { order_id: id, by: pharmacy.id });
    return o.toObject();
  }

  /** Patient approves the pharmacy's basket. Enables payment. */
  async patientApproveBasket(patient: any, id: string) {
    const o = await this.orderModel.findOne({ id, patient_id: patient.id });
    if (!o) throw new NotFoundException('order_not_found');
    if (o.basket_review_status !== 'submitted_for_patient_approval') throw new ForbiddenException('not_submitted');
    o.basket_review_status = 'patient_approved';
    o.basket_decided_at = new Date();
    await o.save();
    this.events.emit('order.basket.approved', { order_id: id, by: patient.id });
    return o.toObject();
  }

  /** Patient rejects basket changes (entire order is cancelled). */
  async patientRejectBasket(patient: any, id: string, reason?: string) {
    const o = await this.orderModel.findOne({ id, patient_id: patient.id });
    if (!o) throw new NotFoundException('order_not_found');
    if (o.basket_review_status !== 'submitted_for_patient_approval') throw new ForbiddenException('not_submitted');
    o.basket_review_status = 'patient_rejected';
    o.basket_decided_at = new Date();
    o.state = 'cancelled' as any;
    (o as any).cancel_reason = reason || 'patient_rejected_basket';
    (o as any).cancelled_at = new Date();
    await o.save();
    this.events.emit('order.basket.rejected', { order_id: id, by: patient.id, reason });
    return o.toObject();
  }

  /** Pharmacy sets insurance pre-auth status for the order. */
  async setInsuranceStatus(pharmacy: any, id: string, status: 'approved' | 'rejected' | 'pending', reason?: string) {
    const o = await this.orderModel.findOne({ id, pharmacy_id: pharmacy.id });
    if (!o) throw new NotFoundException('order_not_found');
    (o as any).insurance_status = status;
    (o as any).insurance_decided_at = new Date();
    if (status === 'rejected' && reason) (o as any).insurance_reject_reason = reason;
    await o.save();
    this.events.emit('order.insurance.updated', { order_id: id, status, by: pharmacy.id });
    return o.toObject();
  }
}
