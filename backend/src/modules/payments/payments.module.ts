import { Module, Injectable, Controller, Post, Get, Body, Param, Logger, BadRequestException, BadGatewayException, NotFoundException, UseGuards, UseInterceptors, Req, HttpCode, Headers } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Transaction, TransactionSchema } from '../../schemas/transaction.schema';
import { OrderSchema } from '../../schemas/order.schema';
import { LabBookingSchema } from '../../schemas/lab.schema';
import { RadiologyBookingSchema } from '../../schemas/radiology.schema';
import { HomeCareBookingSchema } from '../../schemas/home-care.schema';
import { Appointment, AppointmentSchema } from '../../schemas/appointment.schema';
import { InsuranceServiceRequestSchema } from '../insurance-engine/insurance-engine.module';
import { JwtAuthGuard, CurrentUser, Public } from '../../common/auth.guard';
import { WorkflowEngineModule, WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { RealtimeService } from '../realtime/realtime.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { FraudService } from '../finance-engine/finance-engine.module';
import { IdempotencyInterceptor } from '../../common/idempotency.interceptor';
import * as crypto from 'crypto';
import { Request } from 'express';

/**
 * PAYMENT GATEWAY ADAPTERS — additive layer, never bypasses WorkflowEngine.
 * Real API calls require STRIPE_SECRET_KEY / TAP_API_KEY / MOYASAR_API_KEY.
 * When no key is provided, it will throw an error immediately.
 * exercises the full state lifecycle so the rest of the app behaves correctly.
 */
interface GatewayAdapter {
  name: 'stripe' | 'tap' | 'moyasar';
  createIntent(opts: { amount: number; currency: string; description: string; metadata: any }): Promise<{ intent_id: string; client_secret?: string; checkout_url?: string }>;
  verify(intentId: string): Promise<{ status: 'paid' | 'pending' | 'failed' | 'cancelled'; charge_id?: string; raw?: any }>;
  refund(chargeId: string, amount?: number): Promise<{ refunded: boolean; raw?: any }>;
}

function selectAdapter(): GatewayAdapter {
  if (process.env.STRIPE_SECRET_KEY) return new StripeAdapter();
  if (process.env.TAP_API_KEY) return new TapAdapter();
  if (process.env.MOYASAR_API_KEY) return new MoyasarAdapter();
  throw new Error('NO_PAYMENT_GATEWAY_CONFIGURED');
}


class StripeAdapter implements GatewayAdapter {
  name = 'stripe' as const;
  private base = 'https://api.stripe.com/v1';
  private headers() { return { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }; }
  async createIntent(o: any) {
    const body = new URLSearchParams({ amount: String(Math.round(o.amount * 100)), currency: (o.currency || 'sar').toLowerCase(), description: o.description || 'Nabd booking', 'automatic_payment_methods[enabled]': 'true' });
    const r = await fetch(`${this.base}/payment_intents`, { method: 'POST', headers: this.headers(), body });
    const j: any = await r.json();
    if (!r.ok) throw new Error(j.error?.message || 'stripe_intent_failed');
    return { intent_id: j.id, client_secret: j.client_secret };
  }
  async verify(id: string) {
    const r = await fetch(`${this.base}/payment_intents/${id}`, { headers: this.headers() });
    const j: any = await r.json();
    const map: any = { succeeded: 'paid', requires_payment_method: 'failed', canceled: 'cancelled', processing: 'pending' };
    return { status: map[j.status] || 'pending', charge_id: j.latest_charge, raw: j };
  }
  async refund(chargeId: string, amount?: number) {
    const body = new URLSearchParams({ charge: chargeId, ...(amount ? { amount: String(Math.round(amount * 100)) } : {}) });
    const r = await fetch(`${this.base}/refunds`, { method: 'POST', headers: this.headers(), body });
    const j: any = await r.json();
    return { refunded: r.ok, raw: j };
  }
}
class TapAdapter implements GatewayAdapter {
  name = 'tap' as const;
  private base = 'https://api.tap.company/v2';
  private headers() { return { Authorization: `Bearer ${process.env.TAP_API_KEY}`, 'Content-Type': 'application/json' }; }
  async createIntent(o: any) {
    const body = JSON.stringify({ amount: o.amount, currency: o.currency || 'SAR', description: o.description, source: { id: 'src_all' }, redirect: { url: process.env.PUBLIC_APP_URL || 'https://example.com/payment/return' } });
    const r = await fetch(`${this.base}/charges`, { method: 'POST', headers: this.headers(), body });
    const j: any = await r.json();
    if (!r.ok) throw new Error(j.errors?.[0]?.description || 'tap_intent_failed');
    return { intent_id: j.id, checkout_url: j.transaction?.url };
  }
  async verify(id: string) {
    const r = await fetch(`${this.base}/charges/${id}`, { headers: this.headers() });
    const j: any = await r.json();
    const map: any = { CAPTURED: 'paid', INITIATED: 'pending', FAILED: 'failed', CANCELLED: 'cancelled' };
    return { status: map[j.status] || 'pending', charge_id: j.id, raw: j };
  }
  async refund(id: string, amount?: number) {
    const r = await fetch(`${this.base}/refunds`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ charge_id: id, amount }) });
    const j: any = await r.json();
    return { refunded: r.ok, raw: j };
  }
}
class MoyasarAdapter implements GatewayAdapter {
  name = 'moyasar' as const;
  private base = 'https://api.moyasar.com/v1';
  private headers() {
    const b = Buffer.from(`${process.env.MOYASAR_API_KEY}:`).toString('base64');
    return { Authorization: `Basic ${b}`, 'Content-Type': 'application/json' };
  }
  async createIntent(o: any) {
    const body = JSON.stringify({ amount: Math.round(o.amount * 100), currency: o.currency || 'SAR', description: o.description, callback_url: process.env.PUBLIC_APP_URL });
    const r = await fetch(`${this.base}/payments`, { method: 'POST', headers: this.headers(), body });
    const j: any = await r.json();
    if (!r.ok) throw new Error(j.message || 'moyasar_intent_failed');
    return { intent_id: j.id, checkout_url: j.source?.transaction_url };
  }
  async verify(id: string) {
    const r = await fetch(`${this.base}/payments/${id}`, { headers: this.headers() });
    const j: any = await r.json();
    const map: any = { paid: 'paid', initiated: 'pending', failed: 'failed', authorized: 'pending' };
    return { status: map[j.status] || 'pending', charge_id: j.id, raw: j };
  }
  async refund(id: string, amount?: number) {
    const body = JSON.stringify(amount ? { amount: Math.round(amount * 100) } : {});
    const r = await fetch(`${this.base}/payments/${id}/refund`, { method: 'POST', headers: this.headers(), body });
    const j: any = await r.json();
    return { refunded: r.ok, raw: j };
  }
}

const KIND_TO_MODEL: any = { pharmacy: 'Order', lab: 'LabBooking', radiology: 'RadiologyBooking', nursing: 'HomeCareBooking', consultation: Appointment.name };
function normalizeKind(k: string) {
  const m: any = { orders: 'pharmacy', pharmacy: 'pharmacy', lab: 'lab', labs: 'lab', radiology: 'radiology', rads: 'radiology', nursing: 'nursing', 'home-care': 'nursing', homecare: 'nursing', consultation: 'consultation', appt: 'consultation', insurance: 'insurance', 'insurance-copay': 'insurance', copay: 'insurance' };
  return m[k];
}

@Injectable()
export class PaymentsService {
  private logger = new Logger('PaymentsService');
  private adapter: GatewayAdapter;
  constructor(
    @InjectModel('Transaction') private txns: Model<any>,
    @InjectModel('Order') private orders: Model<any>,
    @InjectModel('LabBooking') private labs: Model<any>,
    @InjectModel('RadiologyBooking') private rads: Model<any>,
    @InjectModel('HomeCareBooking') private home: Model<any>,
    @InjectModel(Appointment.name) private appts: Model<any>,
    @InjectModel('InsuranceServiceRequest') private insReqs: Model<any>,
    private engine: WorkflowEngineService,
    private events: EventEmitter2,
    private realtime: RealtimeService,
    private readonly fraud: FraudService,
  ) { this.adapter = selectAdapter(); this.logger.log(`Payment adapter: ${this.adapter.name}`); }

  private modelFor(k: string): Model<any> {
    const kind = normalizeKind(k);
    if (!kind) throw new BadRequestException('invalid_booking_kind');
    if (kind === 'insurance') return this.insReqs;
    return kind === 'pharmacy' ? this.orders : kind === 'lab' ? this.labs : kind === 'radiology' ? this.rads : kind === 'nursing' ? this.home : this.appts;
  }

  private assertBookingOwnerOrAdmin(user: any, booking: any) {
    if (!user?.id || (booking.patient_id !== user.id && user.role !== 'admin')) {
      throw new BadRequestException('not_authorized');
    }
  }

  private assertTransactionVerifier(user: any, transaction: any) {
    if (!user?.id || (transaction.patient_id !== user.id && !['admin', 'system'].includes(user.role))) {
      throw new BadRequestException('not_authorized');
    }
  }

  // ── Governed pharmacy orders (pharmacy_orders collection) ─────────────────
  // The broadcast→offer→selection flow stores orders in `pharmacy_orders` with
  // patient_account_id / pricing_snapshot, not in the legacy `orders` collection.
  private async governedPharmacyOrder(id: string): Promise<any | null> {
    if (!this.txns.db) return null;
    return this.txns.db.collection('pharmacy_orders').findOne({ id });
  }

  /**
   * Server-side due amount for a governed pharmacy order. For insurance orders
   * the patient only ever pays the recorded co-pay (and only AFTER explicitly
   * accepting it); a rejected decision becomes payable only after the patient
   * accepted self-pay (which switches payment_method to card).
   */
  private pharmacyDueAmount(order: any): number {
    const total = Math.round(Number(order.pricing_snapshot?.totals?.total || 0) * 100) / 100;
    if (!(total > 0)) throw new BadRequestException('selected_quote_required');
    const method = String(order.payment_method || '').toLowerCase();
    if (method === 'cod') throw new BadRequestException('cod_orders_do_not_require_online_payment');
    if (method === 'insurance') {
      const decision = order.insurance_decision;
      if (!decision) throw new BadRequestException('insurance_decision_pending');
      if (decision.outcome === 'full') throw new BadRequestException('covered_by_insurance_no_payment_due');
      if (decision.outcome === 'rejected') throw new BadRequestException('insurance_rejected_acceptance_required');
      if (decision.patient_acceptance?.kind !== 'co-pay') throw new BadRequestException('copay_acceptance_required');
      const share = Math.round(Number(decision.patient_share || 0) * 100) / 100;
      if (!(share > 0)) throw new BadRequestException('invalid_amount');
      return share;
    }
    // Online payment is created only after the patient accepted the final quote.
    if (!order.quote_accepted_at) throw new BadRequestException('final_quote_acceptance_required');
    return total;
  }

  /** Public payment capabilities advertised for a governed pharmacy order. */
  async getPharmacyCapabilities(user: any, orderId: string) {
    const order = await this.governedPharmacyOrder(orderId);
    if (!order) throw new NotFoundException('booking_not_found');
    if (order.patient_account_id !== user?.id && user?.role !== 'admin') throw new BadRequestException('not_authorized');
    if (!order.selected_offer_id || !order.pricing_snapshot?.hash) throw new BadRequestException('selected_quote_required');
    const amount = this.pharmacyDueAmount(order);
    const configured = !!(process.env.MOYASAR_API_KEY || process.env.STRIPE_SECRET_KEY || process.env.TAP_API_KEY);
    const methods = configured
      ? [{ id: 'card', kind: 'online' }, { id: 'apple-pay', kind: 'online' }, { id: 'google-pay', kind: 'online' }]
      : [];
    return {
      booking_id: order.id,
      amount,
      currency: String(order.pricing_snapshot?.totals?.currency || 'SAR'),
      methods,
    };
  }

  /**
   * After a pharmacy transaction is verified paid: mark the governed order and
   * emit the gateway-paid event that PharmacyPaymentEvidenceService turns into
   * the fulfillment-gate evidence record. All quote-binding metadata is read
   * from the order document server-side — never from client or gateway input.
   */
  private async finalizeGovernedPharmacyPaid(t: any): Promise<boolean> {
    const order = await this.governedPharmacyOrder(t.booking_id);
    if (!order) return false;
    await this.txns.db.collection('pharmacy_orders').updateOne(
      { id: order.id },
      { $set: { payment_status: 'paid', transaction_id: t.id, paid_at: t.paid_at } },
    );
    this.events.emit('moyasar.payment.paid', {
      id: String(t.gateway_charge_id || t.gateway_intent_id || t.id),
      event_id: `txn_${t.id}`,
      amount_halalas: Math.round(Number(t.amount) * 100),
      currency: String(order.pricing_snapshot?.totals?.currency || 'SAR'),
      metadata: {
        order_id: order.id,
        selected_offer_id: order.selected_offer_id,
        selected_offer_version: Number(order.selected_offer_version),
        quote_snapshot_hash: String(order.pricing_snapshot?.hash || ''),
        payer_account_id: order.patient_account_id,
      },
    });
    return true;
  }

  async createPaymentIntent(user: any, type: string, id: string, idempotencyKey: string) {
    const requestKey = String(idempotencyKey || '').trim();
    if (!requestKey || requestKey.length > 128) throw new BadRequestException('idempotency_key_required');
    const kind = normalizeKind(type);
    // Governed pharmacy orders live in pharmacy_orders — resolve them first.
    let booking: any;
    let governedPharmacy = false;
    if (kind === 'pharmacy') {
      booking = await this.governedPharmacyOrder(id);
      if (booking) governedPharmacy = true;
    }
    if (!booking) {
      const M = this.modelFor(type);
      booking = await M.findOne({ id }).lean();
    }
    if (!booking) throw new NotFoundException('booking_not_found');
    if (governedPharmacy) {
      if (booking.patient_account_id !== user?.id && user?.role !== 'admin') throw new BadRequestException('not_authorized');
      if (['cancelled', 'expired'].includes(String(booking.status))) throw new BadRequestException('payment_order_not_collectable');
      if (!booking.selected_offer_id || !booking.pricing_snapshot?.hash) throw new BadRequestException('selected_quote_required');
    } else {
      this.assertBookingOwnerOrAdmin(user, booking);
    }
    // S4/S7 double-payment prevention: never create a new charge for an already-paid booking.
    // (fraud.detectDuplicatePayments only alerts AFTER the fact — this stops it upfront.)
    if (booking.payment_status === 'paid') throw new BadRequestException('booking_already_paid');
    // insurance copay intents charge the patient's copay share, not the full price
    let amount = governedPharmacy
      ? this.pharmacyDueAmount(booking)
      : kind === 'insurance' ? (booking.copay_amount || 0) : (booking.total || booking.totals?.total || booking.price || 0);
    // Pharmacy insurance orders: after provider approval the patient pays only the
    // provider-set copay — never the full order total (E1 S1/S2).
    if (kind === 'pharmacy' && booking.payment_method === 'insurance'
        && ['APPROVED', 'PARTIAL_APPROVAL'].includes(booking.insurance_status)) {
      amount = Number(booking.insurance_copay || 0);
    }
    // Split wallet+card orders: the wallet portion was already debited at order
    // creation — charge only the remaining card portion (E1 S1 split payment).
    if (kind === 'pharmacy' && Number(booking.wallet_applied || 0) > 0) {
      amount = Math.max(0, Math.round((amount - Number(booking.wallet_applied)) * 100) / 100);
    }
    if (amount <= 0) throw new BadRequestException('invalid_amount');
    const existing: any = await this.txns.findOne({ booking_kind: kind, booking_id: id, status: { $in: ['initiating', 'pending', 'authorized'] } }).lean();
    if (existing) return existing;

    // Persist an active reservation before calling the PSP. The partial unique
    // index is the cross-process guard: a second request cannot create another
    // live gateway intent for the same booking during an in-flight request.
    let txn: any;
    try {
      txn = await this.txns.create({ booking_kind: kind, booking_id: id, patient_id: booking.patient_id || booking.patient_account_id, amount, gateway: this.adapter.name, method: booking.payment_method || 'card', status: 'initiating', idempotency_key: requestKey });
    } catch (error: any) {
      if (error?.code === 11000) {
        const active: any = await this.txns.findOne({ booking_kind: kind, booking_id: id, status: { $in: ['initiating', 'pending', 'authorized'] } }).lean();
        if (active) return active;
      }
      throw error;
    }
    let intent: { intent_id: string; client_secret?: string; checkout_url?: string };
    try {
      intent = await this.adapter.createIntent({ amount, currency: 'SAR', description: `Nabd ${kind} #${id.slice(0, 8)}`, metadata: { booking_id: id, kind } });
    } catch (error: any) {
      // Never expose raw PSP responses or credentials to clients. Keep the detail in server logs for operations.
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Payment gateway intent failed adapter=${this.adapter.name} booking=${id} reason=${reason}`);
      await this.txns.updateOne({ id: txn.id }, { $set: { status: 'failed', failure_reason: 'payment_gateway_unavailable' } });
      throw new BadGatewayException({ code: 'payment_gateway_unavailable', message: 'الدفع غير متاح حالياً' });
    }
    const persisted: any = await this.txns.findOneAndUpdate(
      { id: txn.id, status: 'initiating' },
      { $set: { status: 'pending', gateway_intent_id: intent.intent_id, client_secret: intent.client_secret, checkout_url: intent.checkout_url } },
      { new: true },
    );
    return persisted?.toObject ? persisted.toObject() : persisted;
  }

  async verifyPayment(user: any, transactionId: string) {
    const t = await this.txns.findOne({ id: transactionId });
    if (!t) throw new NotFoundException('txn_not_found');
    // Gateway verification can mutate booking and ledger state. Only the owning
    // patient, an admin, or the signature-authenticated internal webhook path may trigger it.
    this.assertTransactionVerifier(user, t);
    const result = await this.adapter.verify(t.gateway_intent_id);
    t.status = result.status;
    if (result.charge_id) t.gateway_charge_id = result.charge_id;
    if (result.status === 'paid') {
      t.paid_at = new Date();
      if (!(t.booking_kind === 'pharmacy' && await this.finalizeGovernedPharmacyPaid(t))) {
        await this.modelFor(t.booking_kind).updateOne({ id: t.booking_id }, { $set: { payment_status: 'paid', transaction_id: t.id, paid_at: t.paid_at } });
      }
      // For online/home services we emit an event so the workflow engine (provider-jobs / booking-flow)
      // can transition CONFIRMED when payment is required pre-confirmation.
      this.events.emit('payment.completed', {
        kind: t.booking_kind,
        id: t.booking_id,
        booking_kind: t.booking_kind,
        booking_id: t.booking_id,
        patient_id: t.patient_id,
        amount: t.amount,
        transaction_id: t.id
      });
      this.realtime.emitToUser(t.patient_id, 'payment.updated', { transaction_id: t.id, status: 'paid', booking_id: t.booking_id });
      // E1 S15: a second PAID payment for the same booking is a double charge — alert admins
      await this.fraud.detectDuplicatePayments(t.booking_id).catch(() => null);
    } else if (result.status === 'failed') {
      t.failure_reason = result.raw?.last_payment_error?.message || 'gateway_failure';
      this.events.emit('payment.failed', {
        kind: t.booking_kind,
        id: t.booking_id,
        booking_kind: t.booking_kind,
        booking_id: t.booking_id,
        patient_id: t.patient_id,
        amount: t.amount,
        transaction_id: t.id,
        reason: t.failure_reason
      });
      this.realtime.emitToUser(t.patient_id, 'payment.updated', { transaction_id: t.id, status: 'failed', booking_id: t.booking_id });
      // E1 S15: repeated failures in a short window = card testing / bot activity
      await this.fraud.checkPaymentVelocity(t.patient_id).catch(() => false);
    }
    t.webhook_payload = result.raw;
    await t.save();
    return t.toObject();
  }

  async retryPayment(user: any, type: string, id: string, idempotencyKey: string) {
    const kind = normalizeKind(type);
    const booking: any = await this.modelFor(type).findOne({ id }).lean();
    if (!booking) throw new NotFoundException('booking_not_found');
    // Authorize before cancelling an existing transaction.
    this.assertBookingOwnerOrAdmin(user, booking);
    if (booking.payment_status === 'paid') throw new BadRequestException('booking_already_paid');
    await this.txns.updateMany(
      { booking_kind: kind, booking_id: id, status: { $in: ['pending', 'failed'] } },
      { $set: { status: 'cancelled' } },
    );
    return this.createPaymentIntent(user, type, id, idempotencyKey);
  }

  async refundPayment(user: any, transactionId: string, amount?: number, reason?: string) {
    // E5-F2: refunds are ADMIN-ONLY (consistent with moyasar refund E1-F3).
    // Any provider/pharmacy/doctor could previously refund ANY transaction id —
    // a sabotage vector (griefing patients' paid bookings). Providers escalate
    // to admin; patients use the approval flow (/refunds/request).
    if (user.role !== 'admin') throw new BadRequestException('not_authorized');
    const t = await this.txns.findOne({ id: transactionId });
    if (!t) throw new NotFoundException();
    if (t.status !== 'paid' && t.status !== 'partially_refunded') throw new BadRequestException('cannot_refund');
    const r = await this.adapter.refund(t.gateway_charge_id, amount);
    if (!r.refunded) throw new BadRequestException('refund_failed');
    const full = !amount || amount >= t.amount;
    t.status = full ? 'refunded' : 'partially_refunded';
    t.refunded_amount = (t.refunded_amount || 0) + (amount || t.amount);
    t.refunded_at = new Date();
    t.refund_reason = reason;
    await t.save();
    await this.modelFor(t.booking_kind).updateOne({ id: t.booking_id }, { $set: { payment_status: 'refunded' } });
    this.realtime.emitToUser(t.patient_id, 'payment.updated', { transaction_id: t.id, status: t.status });
    return t.toObject();
  }

  /**
   * E1 S3: capture an authorized-only payment (auth-then-capture flow).
   * Moyasar: POST /payments/:id/capture. Admin/provider initiated.
   */
  async capturePayment(user: any, transactionId: string) {
    if (user.role !== 'admin') throw new BadRequestException('not_authorized');
    const t = await this.txns.findOne({ id: transactionId });
    if (!t) throw new NotFoundException('txn_not_found');
    if (t.status !== 'authorized') throw new BadRequestException(`cannot_capture_status_${t.status}`);
    if (t.gateway !== 'moyasar') throw new BadRequestException('capture_supported_for_moyasar_only');
    const key = process.env.MOYASAR_SECRET_KEY || process.env.MOYASAR_SECRET || process.env.MOYASAR_API_KEY;
    if (!key) throw new BadRequestException('payment_gateway_not_configured');
    const r = await fetch(`https://api.moyasar.com/v1/payments/${t.gateway_intent_id}/capture`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) {
      t.webhook_payload = j;
      await t.save();
      throw new BadRequestException(`capture_failed: ${j?.message || r.status}`);
    }
    t.status = 'paid';
    t.paid_at = new Date();
    t.webhook_payload = j;
    await t.save();
    if (!(t.booking_kind === 'pharmacy' && await this.finalizeGovernedPharmacyPaid(t))) {
      await this.modelFor(t.booking_kind).updateOne({ id: t.booking_id }, { $set: { payment_status: 'paid', transaction_id: t.id, paid_at: t.paid_at } });
    }
    this.events.emit('payment.completed', {
      kind: t.booking_kind, id: t.booking_id, booking_kind: t.booking_kind, booking_id: t.booking_id,
      patient_id: t.patient_id, amount: t.amount, transaction_id: t.id,
    });
    this.realtime.emitToUser(t.patient_id, 'payment.updated', { transaction_id: t.id, status: 'paid', booking_id: t.booking_id });
    return t.toObject();
  }

  async listForBooking(user: any, type: string, id: string) {
    const kind = normalizeKind(type);
    // E5-F2 IDOR fix: transactions expose payment metadata — only the booking
    // owner (patient) or staff roles may list them.
    const booking: any = await this.modelFor(type).findOne({ id }).lean();
    if (!booking) throw new NotFoundException('booking_not_found');
    const staffRoles = ['admin', 'finance'];
    if (booking.patient_id !== user.id && !staffRoles.includes(user.role)) {
      throw new BadRequestException('not_authorized');
    }
    return this.txns.find({ booking_kind: kind, booking_id: id }).sort({ createdAt: -1 }).lean();
  }

  async handleWebhook(provider: string, payload: any, signature?: string, rawBody?: string) {
    if (!this.verifyWebhookSignature(provider, signature, rawBody ?? JSON.stringify(payload))) {
      throw new BadRequestException('invalid_webhook_signature');
    }
    // Look up by gateway_intent_id or gateway_charge_id present in payload
    const intentId = payload.data?.object?.id || payload.id || payload.payment_intent;
    if (!intentId) return { ok: false, reason: 'no_intent_id' };
    const t = await this.txns.findOne({ gateway_intent_id: intentId });
    if (!t) return { ok: false, reason: 'no_match' };
    await this.verifyPayment({ id: t.patient_id, role: 'system' }, t.id);
    return { ok: true };
  }

  /** Only a configured Moyasar HMAC over the raw request body may trigger payment mutation. */
  private verifyWebhookSignature(provider: string, signature: string | undefined, rawBody: string): boolean {
    if (provider !== 'moyasar') return false;
    const secret = process.env.MOYASAR_WEBHOOK_SECRET;
    if (!secret || !signature) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const received = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    return received.length === expectedBuffer.length && crypto.timingSafeEqual(received, expectedBuffer);
  }
}

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private svc: PaymentsService) {}
  @Post('intent/:type/:id')
  @UseInterceptors(IdempotencyInterceptor)
  intent(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Headers('idempotency-key') key: string) { return this.svc.createPaymentIntent(u, t, id, key); }
  @Post('verify/:txn') verify(@CurrentUser() u: any, @Param('txn') txn: string) { return this.svc.verifyPayment(u, txn); }
  @Post('retry/:type/:id')
  @UseInterceptors(IdempotencyInterceptor)
  retry(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Headers('idempotency-key') key: string) { return this.svc.retryPayment(u, t, id, key); }
  @Post('refund/:txn') refund(@CurrentUser() u: any, @Param('txn') txn: string, @Body() b: { amount?: number; reason?: string }) { return this.svc.refundPayment(u, txn, b.amount, b.reason); }
  @Post('capture/:txn') capture(@CurrentUser() u: any, @Param('txn') txn: string) { return this.svc.capturePayment(u, txn); }
  @Get('pharmacy/:orderId/capabilities') pharmacyCapabilities(@CurrentUser() u: any, @Param('orderId') orderId: string) { return this.svc.getPharmacyCapabilities(u, orderId); }
  @Get('booking/:type/:id') list(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string) { return this.svc.listForBooking(u, t, id); }
}

@Controller('payments/webhook')
export class PaymentsWebhookController {
  constructor(private svc: PaymentsService) {}
  @Public()
  @Post(':provider') @HttpCode(200) async webhook(
    @Param('provider') p: string,
    @Body() b: any,
    @Headers('moyasar-signature') signature: string,
    @Req() req: Request,
  ) {
    const rawBody = (req as any).rawBody || JSON.stringify(b);
    return this.svc.handleWebhook(p, b, signature, rawBody);
  }
}

@Module({
  imports: [
    WorkflowEngineModule, RealtimeModule,
    MongooseModule.forFeature([
      { name: 'Transaction', schema: TransactionSchema },
      { name: 'Order', schema: OrderSchema },
      { name: 'LabBooking', schema: LabBookingSchema },
      { name: 'RadiologyBooking', schema: RadiologyBookingSchema },
      { name: 'HomeCareBooking', schema: HomeCareBookingSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: 'InsuranceServiceRequest', schema: InsuranceServiceRequestSchema },
    ]),
  ],
  controllers: [PaymentsController, PaymentsWebhookController],
  providers: [PaymentsService, IdempotencyInterceptor],
  exports: [PaymentsService],
})
export class PaymentsModule {}
