import axios from 'axios';
import * as PDFDocument from 'pdfkit';
import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Inject, ServiceUnavailableException } from '@nestjs/common';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Order, OrderDocument, PharmacyBid } from '../../schemas/order.schema';
import { Medicine, MedicineDocument } from '../../schemas/medicine.schema';
import { Delivery, DeliveryDocument } from '../../schemas/delivery.schema';
import { OrderState, ORDER_TRANSITIONS, UserRole, DeliveryState } from '../../common/enums';
import { EVENTS } from '../../common/events';
import { DispatchService } from './dispatch.service';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { OrderRepository } from "./repositories/order.repository";
import { MedicineRepository } from "./repositories/medicine.repository";
import { DeliveryRepository } from "./repositories/delivery.repository";
import { PharmacyBidRepository } from "./repositories/pharmacybid.repository";

@Injectable()
export class OrdersService {
  constructor(
    @Inject('OrderRepository') private orderModel: OrderRepository,
    @Inject('MedicineRepository') private medModel: MedicineRepository,
    @Inject('DeliveryRepository') private delModel: DeliveryRepository,
    @Inject('PharmacyBidRepository') private bidModel: PharmacyBidRepository,
    private events: EventEmitter2,
    private dispatchSvc: DispatchService,
    private engine: WorkflowEngineService,
  ) {}

  // ============ CREATE ============
  /**
   * NEW FLOW (Geo Dispatch):
   *  - Patient submits items + delivery_address (with lat/lng)
   *  - NO pharmacy_id from client — system auto-selects
   *  - Backend dispatches: nearest pharmacy with best inventory match
   *  - If best pharmacy has <100% items, splits remaining into sub-order to next-best pharmacy
   */
  async create(patient: any, data: any) {
    const inputItems = data.items || data.cartItems;
    if (!inputItems || inputItems.length === 0) throw new BadRequestException('Empty cart');
    if (!data.delivery_address?.lat || !data.delivery_address?.lng) {
      throw new BadRequestException('Delivery location (lat/lng) required for dispatch');
    }
    const origin = { lat: data.delivery_address.lat, lng: data.delivery_address.lng };
    data.items = inputItems;

    // 1. Resolve items + handle manual entries
    const items: any[] = [];
    let subtotal = 0;
    for (const it of data.items) {
      let med: any = null;
      if (it.medicine_id) med = await this.medModel.findOne({ id: it.medicine_id });
      const qty = Math.max(1, it.qty || 1);
      const price = med?.price ?? it.price ?? 0;
      if (!med && it.name_ar) {
        med = await this.medModel.create({
          name_ar: it.name_ar, name_en: it.name_en, active_ingredient: it.active_ingredient,
          price, category: 'medications', verified: false, source: 'patient',
          created_by_user_id: patient.id, created_by_role: patient.role,
        });
        this.events.emit(EVENTS.MEDICINE_PENDING_REVIEW, { medicine_id: med.id, by_role: patient.role });
      }
      if (!med) continue;
      items.push({ medicine_id: med.id, name_ar: med.name_ar, name_en: med.name_en, qty, price, image: med.image, is_manual_entry: !it.medicine_id });
      subtotal += price * qty;
    }
    const delivery_fee = 15;

    // 2. Run dispatch
    const result = await this.dispatchSvc.dispatch(origin, items.map((i) => ({ medicine_id: i.medicine_id, qty: i.qty })));

    // 3. Create primary order
    const order = await this.orderModel.create({
      patient_id: patient.id,
      patient_name: patient.full_name,
      patient_phone: patient.phone,
      pharmacy_id: result.selected_pharmacy_id || undefined,
      prescription_id: data.prescription_id,
      items: result.ok && result.missing_items.length > 0
        ? items.filter((it) => result.fulfilled_items.some((f) => f.medicine_id === it.medicine_id))
        : items,
      subtotal: (result.ok && result.missing_items.length > 0
        ? items.filter((it) => result.fulfilled_items.some((f) => f.medicine_id === it.medicine_id))
        : items).reduce((s, it) => s + it.price * it.qty, 0),
      delivery_fee,
      total: 0, // set below
      delivery_address: data.delivery_address,
      notes: data.notes,
      payment_method: data.payment_method || 'cash',
      payment_status: 'pending',
      insurance_status: data.insurance_status || (data.hasInsurance || data.payment_method === 'insurance' ? 'pending' : 'none'),
      insurance_copay: data.total_copay || 0,
      basket_review_status: items.some(i => i.is_manual_entry) ? 'pending_pharmacy_review' : 'none',
      state: OrderState.CREATED,
      state_history: [{ from: '', to: OrderState.CREATED, by_user_id: patient.id, by_role: patient.role, at: new Date() }],
      dispatch: {
        current_radius_km: result.radius_used,
        attempts: result.attempts,
        selected_pharmacy_id: result.selected_pharmacy_id || undefined,
        selection_reason: result.ok ? `Auto-selected nearest pharmacy with highest item availability (${result.best_candidate?.available_count}/${items.length} items within ${result.radius_used}km)` : 'No pharmacy could fulfill any items — escalated to admin',
        started_at: new Date(),
      },
      is_split: false,
    });
    order.total = data.totalAmount ?? (order.subtotal + delivery_fee);
    await order.save();
    this.events.emit(EVENTS.ORDER_CREATED, { order_id: order.id, patient_id: patient.id });
    await this.engine.announceCreated({ kind: 'pharmacy', entity_id: order.id, actor_account_id: patient.id, actor_role: 'patient', patient_account_id: patient.id, meta: { pharmacy_id: result.selected_pharmacy_id, items: items.length, total: order.total } });

    // 4. If no dispatch possible -> escalate
    if (!result.ok) {
      // Re-read to avoid stale __v after transitions emit save() in event handlers
      const fresh = await this.orderModel.findOne({ id: order.id });
      if (fresh) {
        fresh.state = OrderState.ESCALATED_TO_ADMIN;
        fresh.escalated = true;
        fresh.state_history.push({ from: OrderState.CREATED, to: OrderState.ESCALATED_TO_ADMIN, by_user_id: 'system', by_role: 'system', reason: 'no-pharmacy-available', at: new Date() } as any);
        await fresh.save();
        this.events.emit(EVENTS.ORDER_ESCALATED, { order_id: fresh.id });
      }
      return this.getById(order.id);
    }

    // 5. Transition primary order to PHARMACY_RECEIVED
    await this.transition(order.id, OrderState.VALIDATED, patient);
    await this.transition(order.id, OrderState.PHARMACY_RECEIVED, { id: 'system', role: 'system' });
    this.events.emit(EVENTS.ORDER_RECEIVED_BY_PHARMACY, { order_id: order.id, pharmacy_id: result.selected_pharmacy_id });

    // 6. If split needed -> create sub-order for remaining items
    if (result.missing_items.length > 0) {
      const missingFullItems = items.filter((it) => result.missing_items.some((m) => m.medicine_id === it.medicine_id));
      const splitResult = await this.dispatchSvc.dispatchSplit(
        origin,
        missingFullItems.map((i) => ({ medicine_id: i.medicine_id, qty: i.qty })),
        [result.selected_pharmacy_id!],
      );
      const sub = await this.orderModel.create({
        patient_id: patient.id, patient_name: patient.full_name, patient_phone: patient.phone,
        pharmacy_id: splitResult.selected_pharmacy_id || undefined,
        items: splitResult.ok ? missingFullItems.filter((it) => splitResult.fulfilled_items.some((f) => f.medicine_id === it.medicine_id)) : missingFullItems,
        subtotal: missingFullItems.reduce((s, it) => s + it.price * it.qty, 0),
        delivery_fee: 0, // bundled
        total: missingFullItems.reduce((s, it) => s + it.price * it.qty, 0),
        delivery_address: data.delivery_address, notes: data.notes,
        state: splitResult.ok ? OrderState.PHARMACY_RECEIVED : OrderState.ESCALATED_TO_ADMIN,
        state_history: [{ from: '', to: OrderState.CREATED, by_user_id: patient.id, by_role: patient.role, at: new Date() }],
        dispatch: {
          current_radius_km: splitResult.radius_used,
          attempts: [],
          selected_pharmacy_id: splitResult.selected_pharmacy_id || undefined,
          selection_reason: 'Split-order fallback to next nearest pharmacy',
          started_at: new Date(),
        },
        is_split: true, parent_order_id: order.id,
      });
      // Re-fetch parent before final save to dodge stale __v
      await this.orderModel.updateOne(
        { id: order.id },
        { $set: { sub_order_ids: [sub.id], is_split: true } },
      );
      this.events.emit(EVENTS.ORDER_CREATED, { order_id: sub.id, patient_id: patient.id, split_from: order.id });
    }

    return this.getById(order.id);
  }

  // ============ STATE MACHINE TRANSITIONS ============
  async transition(orderId: string, to: OrderState, by: any, reason?: string) {
    const order = await this.orderModel.findOne({ id: orderId });
    if (!order) throw new NotFoundException();
    const allowed = ORDER_TRANSITIONS[order.state] || [];
    if (by.role !== UserRole.ADMIN && by.role !== 'system' && !allowed.includes(to)) {
      throw new BadRequestException(`Invalid transition ${order.state} → ${to}`);
    }
    const from = order.state;
    return await this.engine.apply({
      kind: 'pharmacy', entity_id: order.id, from_domain: from, to_domain: to,
      actor_account_id: by.id, actor_role: by.role, patient_account_id: order.patient_id, reason,
      mutate: async () => {
        order.state = to;
        order.state_history.push({ from, to, by_user_id: by.id, by_role: by.role, reason, at: new Date() } as any);
        if (to === OrderState.REJECTED) {
          order.rejection_reason = reason; order.rejected_by = by.id;
          this.events.emit(EVENTS.ORDER_REJECTED, { order_id: order.id });
          order.escalated = true;
          order.state_history.push({ from: to, to: OrderState.ESCALATED_TO_ADMIN, by_user_id: 'system', by_role: 'system', reason: 'auto-escalate-on-reject', at: new Date() } as any);
          order.state = OrderState.ESCALATED_TO_ADMIN;
          this.events.emit(EVENTS.ORDER_ESCALATED, { order_id: order.id });
        }
        if (to === OrderState.READY_FOR_DISPATCH) {
          const existingDel = await this.delModel.findOne({ order_id: order.id });
          if (!existingDel) await this.delModel.create({ order_id: order.id, pharmacy_id: order.pharmacy_id, state: DeliveryState.UNASSIGNED });
          this.events.emit(EVENTS.ORDER_READY, { order_id: order.id });
        }
        if (to === OrderState.ASSIGNED_TO_DELIVERY) this.events.emit(EVENTS.ORDER_ASSIGNED, { order_id: order.id });
        if (to === OrderState.OUT_FOR_DELIVERY) this.events.emit(EVENTS.ORDER_OUT_FOR_DELIVERY, { order_id: order.id });
        if (to === OrderState.DELIVERED) this.events.emit(EVENTS.ORDER_DELIVERED, { order_id: order.id });
        if (to === OrderState.CANCELLED) this.events.emit(EVENTS.ORDER_CANCELLED, { order_id: order.id });
        if (to === OrderState.ACCEPTED) {
          this.events.emit(EVENTS.ORDER_ACCEPTED, { order_id: order.id });
          if (order.pharmacy_id) await this.dispatchSvc.deductStock(order.pharmacy_id, order.items.map((it: any) => ({ medicine_id: it.medicine_id, qty: it.qty })));
        }
        if (to === OrderState.PREPARING) this.events.emit(EVENTS.ORDER_PREPARING, { order_id: order.id });
        if (to === OrderState.PARTIALLY_FULFILLED) this.events.emit(EVENTS.ORDER_PARTIAL, { order_id: order.id });
        if (to === OrderState.PHARMACY_RECEIVED) this.events.emit(EVENTS.ORDER_RECEIVED_BY_PHARMACY, { order_id: order.id });
        await order.save();
        return order.toObject();
      },
    });
  }

  // ============ QUERIES ============
  async getById(id: string) {
    const o = await this.orderModel.findOne({ id }, { _id: 0, __v: 0 });
    if (!o) throw new NotFoundException();
    // Hydrate sub-orders
    if (o.is_split && o.sub_order_ids?.length) {
      const subs = await this.orderModel.find({ id: { $in: o.sub_order_ids } }, { _id: 0, __v: 0 });
      (o as any).sub_orders = subs;
    }
    return o;
  }
  async listMine(patient_id: string, type?: string) {
    const q: any = { patient_id, parent_order_id: { $exists: false } };
    if (type) {
      q.type = type;
    }
    return this.orderModel.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100);
  }
  async listForPharmacy(pharmacy_id: string, state?: OrderState) {
    const q: any = { pharmacy_id };
    if (state) q.state = state;
    return this.orderModel.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200);
  }
  async listAll(state?: OrderState, search?: string) {
    const q: any = {};
    if (state) q.state = state;
    if (search) q.$or = [{ id: search }, { patient_phone: { $regex: search, $options: 'i' } }];
    return this.orderModel.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(500);
  }
  async listEscalated() {
    return this.orderModel.find({ escalated: true, state: { $ne: OrderState.DELIVERED } }, { _id: 0, __v: 0 });
  }

  // ============ PHARMACY ACTIONS ============
  async accept(orderId: string, by: any) { return this.transition(orderId, OrderState.ACCEPTED, by); }
  async reject(orderId: string, by: any, reason: string) {
    // On rejection, attempt re-dispatch to next best pharmacy automatically
    const order = await this.orderModel.findOne({ id: orderId });
    if (!order) throw new NotFoundException();
    const rejectedPharm = order.pharmacy_id;
    await this.transition(orderId, OrderState.REJECTED, by, reason);
    if (order.delivery_address?.lat && order.delivery_address?.lng) {
      const result = await this.dispatchSvc.dispatchSplit(
        { lat: order.delivery_address.lat, lng: order.delivery_address.lng },
        order.items.map((it: any) => ({ medicine_id: it.medicine_id, qty: it.qty })),
        rejectedPharm ? [rejectedPharm] : [],
      );
      if (result.ok) {
        order.pharmacy_id = result.selected_pharmacy_id!;
        order.escalated = false;
        order.state = OrderState.CREATED;
        order.state_history.push({ from: OrderState.ESCALATED_TO_ADMIN, to: OrderState.CREATED, by_user_id: 'system', by_role: 'system', reason: 're-dispatch-after-rejection', at: new Date() } as any);
        await order.save();
        await this.transition(orderId, OrderState.PHARMACY_RECEIVED, { id: 'system', role: 'system' });
      }
    }
    return this.getById(orderId);
  }
  async markPreparing(orderId: string, by: any) { return this.transition(orderId, OrderState.PREPARING, by); }
  async markReady(orderId: string, by: any) { return this.transition(orderId, OrderState.READY_FOR_DISPATCH, by); }
  async markPartial(orderId: string, by: any, unavailableMedicineIds: string[]) {
    const o = await this.orderModel.findOne({ id: orderId });
    if (!o) throw new NotFoundException();
    o.items = o.items.map((it: any) => ({ ...it, unavailable: unavailableMedicineIds.includes(it.medicine_id) } as any));
    o.subtotal = o.items.filter((it: any) => !it.unavailable).reduce((s: number, it: any) => s + it.price * it.qty, 0);
    o.total = o.subtotal + (o.delivery_fee || 0);
    await o.save();
    return this.transition(orderId, OrderState.PARTIALLY_FULFILLED, by);
  }
  async cancel(orderId: string, by: any, reason: string) {
    const order = await this.orderModel.findOne({ id: orderId });
    if (!order) throw new NotFoundException();
    
    if (['DELIVERED', 'COMPLETED', 'ANALYZING', 'FULFILLED', OrderState.DELIVERED, OrderState.PARTIALLY_FULFILLED].includes(order.state as string)) {
      throw new BadRequestException('Cannot cancel order at this stage');
    }

    // REAL REFUND LOGIC (Moyasar Integration)
    if ((order.state as string) === 'PAID' && (order as any).payment_id && (order as any).payment_id.startsWith('pi_')) {
      const paymentSecret = process.env.MOYASAR_SECRET_KEY;
      if (!paymentSecret) {
        throw new ServiceUnavailableException('Payment refunds are unavailable because the payment gateway is not configured');
      }
      try {
        const amount_in_halalas = Math.round((order.total || 0) * 100);
        await axios.post(
          `https://api.moyasar.com/v1/payments/${(order as any).payment_id}/refund`,
          { amount: amount_in_halalas, reason: reason || 'User requested cancellation' },
          { auth: { username: paymentSecret, password: '' } }
        );
        // Mark as refunded
        await this.orderModel.updateOne({ id: orderId }, { refund_status: 'REFUNDED' });
      } catch (err) {
        console.error('Moyasar Refund Failed:', err.response?.data || err.message);
        throw new BadRequestException('Failed to process financial refund through payment gateway');
      }
    }

    return this.transition(orderId, OrderState.CANCELLED, by, reason);
  }

  // REAL PDF GENERATION LOGIC
  async generatePdf(orderId: string): Promise<any> {
    const order = await this.orderModel.findOne({ id: orderId });
    if (!order) throw new NotFoundException();

    return new Promise((resolve) => {
      const doc = new (PDFDocument as any)({ margin: 50, size: 'A4' });
      const buffers: any[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      // Header
      doc.fontSize(24).fillColor('#004D40').text('Nabd Plus - Medical Report', { align: 'center' });
      doc.moveDown();
      
      // Patient & Order Info
      doc.fontSize(12).fillColor('#333333');
      doc.text(`Order ID: ${order.id}`);
      doc.text(`Date: ${new Date().toLocaleDateString()}`);
      doc.moveDown(2);

      if (!order.results || order.results.length === 0) {
        doc.fontSize(14).fillColor('#666666').text('No results available yet.', { align: 'center' });
      } else {
        // Table Header
        const tableTop = doc.y;
        doc.font('Helvetica-Bold');
        doc.text('Test Name', 50, tableTop);
        doc.text('Result', 250, tableTop);
        doc.text('Reference', 350, tableTop);
        doc.text('Status', 450, tableTop);
        doc.moveTo(50, tableTop + 15).lineTo(500, tableTop + 15).stroke();
        
        let y = tableTop + 25;
        doc.font('Helvetica');

        // Render each structured result
        order.results.forEach((res: any) => {
          const isAbnormal = res.isAbnormal === true;
          
          doc.fillColor('#333333').text(res.name || 'Unknown', 50, y);
          doc.fillColor(isAbnormal ? '#D32F2F' : '#333333').text(String(res.result || '-'), 250, y);
          doc.fillColor('#666666').text(res.reference || '-', 350, y);
          doc.fillColor(isAbnormal ? '#D32F2F' : '#4CAF50').text(isAbnormal ? 'Abnormal' : 'Normal', 450, y);
          
          y += 20;
          doc.moveTo(50, y - 5).lineTo(500, y - 5).strokeColor('#EEEEEE').stroke();
        });
      }

      // Footer
      doc.fontSize(10).fillColor('#999999').text('Generated securely by Nabdah Systems.', 50, 750, { align: 'center' });
      doc.end();
    });
  }


  // ============ DELIVERY ============
  async assignDelivery(orderId: string, driver_id: string, by: any) {
    const o = await this.orderModel.findOne({ id: orderId });
    if (!o) throw new NotFoundException();
    let del = await this.delModel.findOne({ order_id: orderId });
    if (!del) del = await this.delModel.create({ order_id: orderId, pharmacy_id: o.pharmacy_id });
    del.driver_id = driver_id; del.state = DeliveryState.ASSIGNED;
    await del.save();
    o.delivery_id = del.id; await o.save();
    this.events.emit(EVENTS.DELIVERY_ASSIGNED, { order_id: orderId, driver_id });
    return this.transition(orderId, OrderState.ASSIGNED_TO_DELIVERY, by);
  }

  async updateDelivery(orderId: string, state: DeliveryState, location?: any) {
    const del = await this.delModel.findOneAndUpdate(
      { order_id: orderId },
      { $set: { state, ...(location ? { current_location: location } : {}) } },
      { new: true },
    );
    this.events.emit(EVENTS.DELIVERY_UPDATED, { order_id: orderId, state });
    return del;
  }

  // Reorder — keep items, re-dispatch via geo
  async reorder(orderId: string, patient: any) {
    const o = await this.orderModel.findOne({ id: orderId, patient_id: patient.id });
    if (!o) throw new NotFoundException();
    return this.create(patient, {
      items: o.items.map((it: any) => ({ medicine_id: it.medicine_id, qty: it.qty })),
      delivery_address: o.delivery_address,
    });
  }

  /**
   * Partial Reorder — re-dispatch using a CUSTOM modified list of items
   * (patient may add/remove/change quantities before re-ordering).
   * Optionally overrides delivery_address. Falls back to original address.
   */
  async reorderPartial(orderId: string, patient: any, body: { items: any[]; delivery_address?: any; notes?: string }) {
    const o = await this.orderModel.findOne({ id: orderId, patient_id: patient.id });
    if (!o) throw new NotFoundException();
    if (!Array.isArray(body.items) || body.items.length === 0) throw new BadRequestException('items_required');
    return this.create(patient, {
      items: body.items.map((it: any) => ({
        medicine_id: it.medicine_id,
        qty: Math.max(1, parseInt(it.qty, 10) || 1),
        name_ar: it.name_ar,
        name_en: it.name_en,
        price: it.price,
      })),
      delivery_address: body.delivery_address || o.delivery_address,
      notes: body.notes,
    });
  }

  // ============ Basket Review (patient side) ============
  async patientApproveBasket(patient: any, id: string) {
    const o = await this.orderModel.findOne({ id, patient_id: patient.id });
    if (!o) throw new NotFoundException('order_not_found');
    if ((o as any).basket_review_status !== 'submitted_for_patient_approval') throw new ForbiddenException('not_submitted');
    (o as any).basket_review_status = 'patient_approved';
    (o as any).basket_decided_at = new Date();
    await o.save();
    this.events.emit('order.basket.approved', { order_id: id, by: patient.id });
    return o.toObject();
  }

  async patientRejectBasket(patient: any, id: string, reason?: string) {
    const o = await this.orderModel.findOne({ id, patient_id: patient.id });
    if (!o) throw new NotFoundException('order_not_found');
    if ((o as any).basket_review_status !== 'submitted_for_patient_approval') throw new ForbiddenException('not_submitted');
    (o as any).basket_review_status = 'patient_rejected';
    (o as any).basket_decided_at = new Date();
    o.state = OrderState.CANCELLED;
    (o as any).cancel_reason = reason || 'patient_rejected_basket';
    (o as any).cancelled_at = new Date();
    await o.save();
    this.events.emit('order.basket.rejected', { order_id: id, by: patient.id, reason });
    return o.toObject();
  }

  // ============ PHARMACY GEO-BIDDING ============
  async placeBid(user: any, body: { prescription_request_id: string; items: any[]; total_price: number; expires_in_mins?: number }) {
    if (!['admin', 'pharmacy'].includes(user.role)) throw new ForbiddenException();

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + (body.expires_in_mins || 60));

    const bid = await this.bidModel.create({
      id: require('uuid').v4(),
      prescription_request_id: body.prescription_request_id,
      pharmacy_id: user.id,
      items: body.items,
      total_price: body.total_price,
      expires_at: expiresAt,
      status: 'pending',
    });

    this.events.emit('pharmacy.bid_placed', { bid_id: bid.id, pharmacy_id: user.id, request_id: body.prescription_request_id });
    return bid;
  }

  async acceptBid(user: any, bidId: string) {
    const bid = await this.bidModel.findOne({ id: bidId });
    if (!bid) throw new NotFoundException('bid_not_found');
    if (bid.status !== 'pending') throw new BadRequestException('bid_is_not_pending');

    // Update this bid to accepted
    await this.bidModel.updateOne({ id: bidId }, { $set: { status: 'accepted' } });

    // Reject other bids for the same request
    await this.bidModel.updateMany(
      { prescription_request_id: bid.prescription_request_id, id: { $ne: bidId } },
      { $set: { status: 'rejected' } }
    );

    // Update the corresponding order/booking in the system
    const order = await this.orderModel.findOne({ id: bid.prescription_request_id });
    if (order) {
      order.pharmacy_id = bid.pharmacy_id;
      order.state = OrderState.ACCEPTED;
      order.state_history.push({ from: order.state, to: OrderState.ACCEPTED, by_user_id: user.id, by_role: user.role, at: new Date(), reason: 'bid_accepted' });
      
      // Update order items & pricing from accepted bid
      const orderItems: any[] = [];
      let subtotal = 0;
      for (const it of bid.items) {
        if (it.available) {
          orderItems.push({
            medicine_id: it.medicine_id || 'manual',
            name_ar: it.alternative_name || it.name_ar,
            qty: 1,
            price: it.price,
            is_substitute: !!it.alternative_name,
            substituted_from: it.alternative_name ? it.name_ar : undefined,
          });
          subtotal += it.price;
        }
      }
      order.items = orderItems;
      order.subtotal = subtotal;
      order.total = subtotal + order.delivery_fee;
      await order.save();
    }

    this.events.emit('pharmacy.bid_accepted', { bid_id: bidId, order_id: bid.prescription_request_id });
    return { ok: true };
  }

  async listBids(user: any, requestId: string) {
    return this.bidModel.find({ prescription_request_id: requestId }).sort({ total_price: 1 }).lean();
  }

  async listPharmacyBids(user: any) {
    if (!['admin', 'pharmacy'].includes(user.role)) throw new ForbiddenException();
    return this.bidModel.find({ pharmacy_id: user.id }).sort({ createdAt: -1 }).lean();
  }

  async getTracking(id: string) {
    const order = await this.orderModel.findOne({ id }).lean();
    if (!order) throw new NotFoundException();

    let delivery = null;
    if (order.delivery_id) {
      const del = await this.delModel.findOne({ id: order.delivery_id }).lean();
      if (del) {
        delivery = {
          state: del.state,
          eta_minutes: del.eta_minutes,
          driver_id: del.driver_id,
          location: del.current_location,
        };
      }
    }

    return {
      order_id: order.id,
      state: order.state,
      delivery
    };
  }

  // ============ INSURANCE APPROVAL (PROVIDER) ============
  async updateInsuranceApproval(id: string, payload: { status?: string; totalCopay?: number; items?: any[] }, user: any) {
    const order = await this.orderModel.findOne({ id });
    if (!order) throw new NotFoundException('Order not found');

    const { status, totalCopay, items } = payload;
    
    if (status) {
      order.insurance_status = status;
      if (['PENDING_INSURANCE', 'APPROVED', 'PARTIAL_APPROVAL', 'REJECTED'].includes(status)) {
        await this.transition(id, status as OrderState, user);
      }
    }
    
    if (totalCopay !== undefined) {
      order.insurance_copay = totalCopay;
    }

    if (items && Array.isArray(items)) {
      for (const itemPayload of items) {
        const item = order.items.find((i: any) => i.medicine_id === itemPayload.medicine_id);
        if (item) {
          if (itemPayload.isCovered !== undefined) (item as any).isCovered = itemPayload.isCovered;
          if (itemPayload.rejectReason !== undefined) (item as any).rejectReason = itemPayload.rejectReason;
          if (itemPayload.cashPrice !== undefined) (item as any).cashPrice = itemPayload.cashPrice;
        }
      }
      order.markModified('items');
    }
    
    await order.save();
    return order.toObject();
  }

  // ============ PATIENT CASH OPT-IN ============
  async optInCash(id: string, itemId: string, payload: { optInCash?: boolean }, user: any) {
    const order = await this.orderModel.findOne({ id, patient_id: user.id });
    if (!order) throw new NotFoundException('Order not found');

    const item = order.items.find((i: any) => i.medicine_id === itemId);
    if (!item) throw new NotFoundException('Item not found');

    (item as any).optInCash = payload.optInCash ?? true;
    order.markModified('items');
    
    await order.save();
    return order.toObject();
  }
}
