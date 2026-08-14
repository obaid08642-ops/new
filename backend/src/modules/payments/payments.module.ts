import { Module, Injectable, Controller, Post, Get, Body, Param, Logger, BadRequestException, NotFoundException, UseGuards, Req, HttpCode } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Transaction, TransactionSchema } from '../../schemas/transaction.schema';
import { OrderSchema } from '../../schemas/order.schema';
import { LabBookingSchema } from '../../schemas/lab.schema';
import { RadiologyBookingSchema } from '../../schemas/radiology.schema';
import { HomeCareBookingSchema } from '../../schemas/home-care.schema';
import { Appointment, AppointmentSchema } from '../../schemas/appointment.schema';
import { JwtAuthGuard, CurrentUser, Public } from '../../common/auth.guard';
import { WorkflowEngineModule, WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { RealtimeService } from '../realtime/realtime.service';
import { RealtimeModule } from '../realtime/realtime.module';

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
  const m: any = { orders: 'pharmacy', pharmacy: 'pharmacy', lab: 'lab', labs: 'lab', radiology: 'radiology', rads: 'radiology', nursing: 'nursing', 'home-care': 'nursing', homecare: 'nursing', consultation: 'consultation', appt: 'consultation' };
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
    private engine: WorkflowEngineService,
    private events: EventEmitter2,
    private realtime: RealtimeService,
  ) { this.adapter = selectAdapter(); this.logger.log(`Payment adapter: ${this.adapter.name}`); }

  private modelFor(k: string): Model<any> {
    const kind = normalizeKind(k);
    if (!kind) throw new BadRequestException('invalid_booking_kind');
    return kind === 'pharmacy' ? this.orders : kind === 'lab' ? this.labs : kind === 'radiology' ? this.rads : kind === 'nursing' ? this.home : this.appts;
  }

  async createPaymentIntent(user: any, type: string, id: string) {
    const kind = normalizeKind(type);
    const M = this.modelFor(type);
    const booking: any = await M.findOne({ id }).lean();
    if (!booking) throw new NotFoundException('booking_not_found');
    if (booking.patient_id !== user.id && user.role !== 'admin') throw new BadRequestException('not_authorized');
    const amount = booking.total || booking.totals?.total || booking.price || 0;
    if (amount <= 0) throw new BadRequestException('invalid_amount');
    const existing: any = await this.txns.findOne({ booking_id: id, status: { $in: ['pending', 'authorized'] } }).lean();
    if (existing) return existing;
    const intent = await this.adapter.createIntent({ amount, currency: 'SAR', description: `Nabd ${kind} #${id.slice(0, 8)}`, metadata: { booking_id: id, kind } });
    const txn = await this.txns.create({ booking_kind: kind, booking_id: id, patient_id: booking.patient_id, amount, gateway: this.adapter.name, method: booking.payment_method || 'card', status: 'pending', gateway_intent_id: intent.intent_id, client_secret: intent.client_secret, checkout_url: intent.checkout_url });
    return txn.toObject ? txn.toObject() : txn;
  }

  async verifyPayment(user: any, transactionId: string) {
    const t = await this.txns.findOne({ id: transactionId });
    if (!t) throw new NotFoundException('txn_not_found');
    const result = await this.adapter.verify(t.gateway_intent_id);
    t.status = result.status;
    if (result.charge_id) t.gateway_charge_id = result.charge_id;
    if (result.status === 'paid') {
      t.paid_at = new Date();
      await this.modelFor(t.booking_kind).updateOne({ id: t.booking_id }, { $set: { payment_status: 'paid', transaction_id: t.id, paid_at: t.paid_at } });
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
    }
    t.webhook_payload = result.raw;
    await t.save();
    return t.toObject();
  }

  async retryPayment(user: any, type: string, id: string) {
    // Cancel pending failed and create new intent
    await this.txns.updateMany({ booking_id: id, status: { $in: ['pending', 'failed'] } }, { $set: { status: 'cancelled' } });
    return this.createPaymentIntent(user, type, id);
  }

  async refundPayment(user: any, transactionId: string, amount?: number, reason?: string) {
    if (!['admin', 'pharmacy', 'provider'].includes(user.role) && user.role !== 'doctor') throw new BadRequestException('not_authorized');
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

  async listForBooking(type: string, id: string) {
    const kind = normalizeKind(type);
    return this.txns.find({ booking_kind: kind, booking_id: id }).sort({ createdAt: -1 }).lean();
  }

  async handleWebhook(provider: string, payload: any) {
    // Look up by gateway_intent_id or gateway_charge_id present in payload
    const intentId = payload.data?.object?.id || payload.id || payload.payment_intent;
    if (!intentId) return { ok: false, reason: 'no_intent_id' };
    const t = await this.txns.findOne({ gateway_intent_id: intentId });
    if (!t) return { ok: false, reason: 'no_match' };
    await this.verifyPayment({ id: t.patient_id, role: 'system' }, t.id);
    return { ok: true };
  }
}

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private svc: PaymentsService) {}
  @Post('intent/:type/:id') intent(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string) { return this.svc.createPaymentIntent(u, t, id); }
  @Post('verify/:txn') verify(@CurrentUser() u: any, @Param('txn') txn: string) { return this.svc.verifyPayment(u, txn); }
  @Post('retry/:type/:id') retry(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string) { return this.svc.retryPayment(u, t, id); }
  @Post('refund/:txn') refund(@CurrentUser() u: any, @Param('txn') txn: string, @Body() b: { amount?: number; reason?: string }) { return this.svc.refundPayment(u, txn, b.amount, b.reason); }
  @Get('booking/:type/:id') list(@Param('type') t: string, @Param('id') id: string) { return this.svc.listForBooking(t, id); }
}

@Controller('payments/webhook')
export class PaymentsWebhookController {
  constructor(private svc: PaymentsService) {}
  @Public()
  @Post(':provider') @HttpCode(200) async webhook(@Param('provider') p: string, @Body() b: any) {
    return this.svc.handleWebhook(p, b);
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
    ]),
  ],
  controllers: [PaymentsController, PaymentsWebhookController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
