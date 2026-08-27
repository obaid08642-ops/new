/**
 * M3 — Insurance Engine (BR-2) + Unified Booking Quote (BR-1) + Financial Core.
 *
 * BR-2 (owner-approved insurance flow): patient picks "insurance" → system checks
 * for a policy in profile → request goes PENDING_PROVIDER_REVIEW → provider
 * manually decides (full / partial with patient copay % / reject with reason) →
 * patient notified → patient pays ONLY the copay → provider notified → service starts.
 *
 * BR-1 (payment matrix): online/video/audio/home/delivery = online payment only;
 * clinic = online or pay-at-clinic. Enforced server-side via /bookings/quote.
 */
import { Module, Controller, Injectable, Get, Post, Body, Param, Query, UseGuards, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { InsuranceCompanySchema, InsuranceCompanyDocument } from '../../schemas/insurance.schema';
import { PatientProfileSchema } from '../../schemas/patient-profile.schema';
import { FraudService } from '../finance-engine/finance-engine.module';
import { TransactionSchema } from '../../schemas/transaction.schema';
import { OrderSchema } from '../../schemas/order.schema';
import { LabBookingSchema } from '../../schemas/lab.schema';
import { RadiologyBookingSchema } from '../../schemas/radiology.schema';
import { HomeCareBookingSchema } from '../../schemas/home-care.schema';
import { Appointment, AppointmentSchema } from '../../schemas/appointment.schema';

// ============================================================================
// Schemas
// ============================================================================

@Schema({ timestamps: true })
export class InsuranceServiceRequest {
  @Prop({ required: true, unique: true, default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop() patient_name?: string;
  @Prop({ required: true, index: true }) provider_id: string;
  @Prop() booking_id?: string;          // linked booking/appointment/order
  @Prop() booking_kind?: string;        // consultation | home_care | pharmacy | lab | radiology | nursing
  @Prop() service_type?: string;
  @Prop() channel?: string;             // online | video | audio | clinic | home | delivery
  @Prop({ required: true }) price: number;
  @Prop({ type: Object, required: true }) policy: {
    company_id: string; company_name?: string; plan_class?: string;
    member_id?: string; policy_number?: string; card_image_url?: string;
  };
  @Prop({
    default: 'PENDING_PROVIDER_REVIEW', index: true,
    enum: ['PENDING_PROVIDER_REVIEW', 'APPROVED_FULL', 'APPROVED_PARTIAL', 'REJECTED', 'COPAY_PENDING', 'COPAY_PAID', 'EXPIRED', 'CANCELLED', 'APPEAL_PENDING'],
  }) state: string;
  @Prop() copay_percent?: number;       // patient share % when partial
  @Prop() copay_amount?: number;        // computed = price * percent / 100
  @Prop() rejection_reason?: string;
  @Prop() decided_by?: string;
  @Prop() decided_at?: Date;
  @Prop() payment_id?: string;          // moyasar payment for the copay
  @Prop() copay_paid_at?: Date;
  @Prop({ type: [Object], default: [] }) history: { state: string; at: Date; by: string; note?: string }[];
  @Prop({ type: [String], default: [] }) documents: string[];
  @Prop({ default: 0 }) resubmission_count: number;
  @Prop({ type: Object }) appeal?: {
    reason: string; documents: string[]; state: string;
    filed_at: Date; filed_by: string;
    decided_by?: string; decided_at?: Date; decision_note?: string;
  };
}
export const InsuranceServiceRequestSchema = SchemaFactory.createForClass(InsuranceServiceRequest);

@Schema({ timestamps: true })
export class RefundRequest {
  @Prop({ required: true, unique: true, default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true }) booking_id: string;
  @Prop() booking_kind?: string;
  @Prop({ required: true }) amount_paid: number;
  @Prop({ required: true }) refund_percent: number;  // decided by policy window
  @Prop({ required: true }) refund_amount: number;
  @Prop() policy_note_ar?: string;
  @Prop() reason?: string;
  @Prop() moyasar_payment_id?: string;
  @Prop({ default: 'REQUESTED', index: true, enum: ['REQUESTED', 'APPROVED', 'EXECUTED', 'REJECTED', 'FAILED'] }) state: string;
  @Prop() executed_at?: Date;
  @Prop({ type: [Object], default: [] }) history: { state: string; at: Date; by: string; note?: string }[];
}
export const RefundRequestSchema = SchemaFactory.createForClass(RefundRequest);

@Schema({ timestamps: true })
export class PlatformLedgerEntry {
  @Prop({ required: true, unique: true, default: () => uuid() }) id: string;
  @Prop({ index: true }) order_id?: string;
  @Prop({ index: true }) booking_id?: string;
  @Prop({ required: true, index: true }) provider_id: string;
  @Prop({ required: true }) service_type: string;
  @Prop({ required: true }) gross_amount: number;
  @Prop({ required: true }) commission_rate: number;   // e.g. 0.15
  @Prop({ required: true }) commission_amount: number;
  @Prop({ required: true }) net_provider_amount: number;
  @Prop({ default: 'online' }) payment_method: string; // online | cash | insurance
  @Prop({ default: 'ACCRUED', index: true, enum: ['ACCRUED', 'SETTLED', 'VOID'] }) state: string;
}
export const PlatformLedgerEntrySchema = SchemaFactory.createForClass(PlatformLedgerEntry);

@Schema({ timestamps: true })
export class CommissionRule {
  @Prop({ required: true, unique: true }) service_type: string;
  @Prop({ required: true }) rate: number; // 0..1
  @Prop({ default: true }) active: boolean;
}
export const CommissionRuleSchema = SchemaFactory.createForClass(CommissionRule);

// ============================================================================
// Financial core service
// ============================================================================

const DEFAULT_COMMISSIONS: Record<string, number> = {
  consultation: 0.15, video: 0.15, audio: 0.15, chat: 0.15,
  clinic: 0.12, home_visit: 0.18, nursing: 0.18, physiotherapy: 0.18,
  pharmacy: 0.10, lab: 0.12, radiology: 0.12, ambulance: 0.15, default: 0.15,
};

@Injectable()
export class FinanceCoreService {
  constructor(
    @InjectModel('PlatformLedgerEntry') private ledger: Model<any>,
    @InjectModel('CommissionRule') private rules: Model<any>,
  ) {}

  async rateFor(serviceType: string): Promise<number> {
    const rule = await this.rules.findOne({ service_type: serviceType, active: true }).lean();
    return (rule as any)?.rate ?? DEFAULT_COMMISSIONS[serviceType] ?? DEFAULT_COMMISSIONS.default;
  }

  /** Record commission + provider net for a paid order/booking. Idempotent per order_id. */
  async accrue(input: { order_id?: string; booking_id?: string; provider_id: string; service_type: string; amount: number; payment_method?: string }) {
    if (!input.provider_id || !input.amount) throw new BadRequestException('provider_id and amount required');
    const dupKey = input.order_id || input.booking_id;
    const existing = await this.ledger.findOne({ $or: [{ order_id: dupKey }, { booking_id: dupKey }] });
    if (existing) return existing.toObject();
    const rate = await this.rateFor(input.service_type);
    const commission = Math.round(input.amount * rate * 100) / 100;
    const doc = await this.ledger.create({
      order_id: input.order_id, booking_id: input.booking_id,
      provider_id: input.provider_id, service_type: input.service_type,
      gross_amount: input.amount, commission_rate: rate,
      commission_amount: commission, net_provider_amount: Math.round((input.amount - commission) * 100) / 100,
      payment_method: input.payment_method || 'online',
    });
    return doc.toObject();
  }

  async providerSummary(providerId: string) {
    const agg = await this.ledger.aggregate([
      { $match: { provider_id: providerId, state: 'ACCRUED' } },
      { $group: { _id: null, gross: { $sum: '$gross_amount' }, commission: { $sum: '$commission_amount' }, net: { $sum: '$net_provider_amount' }, count: { $sum: 1 } } },
    ]);
    return agg[0] || { gross: 0, commission: 0, net: 0, count: 0 };
  }

  async platformSummary() {
    const agg = await this.ledger.aggregate([
      { $match: { state: 'ACCRUED' } },
      { $group: { _id: '$service_type', gross: { $sum: '$gross_amount' }, commission: { $sum: '$commission_amount' }, count: { $sum: 1 } } },
    ]);
    const total = agg.reduce((s, r) => s + r.commission, 0);
    return { total_commission: Math.round(total * 100) / 100, by_service: agg };
  }
}

// ============================================================================
// Quote (BR-1) — the server decides allowed payment methods, never the UI
// ============================================================================

const ONLINE_ONLY_CHANNELS = ['online', 'video', 'audio', 'chat', 'home', 'home_visit', 'delivery', 'nursing', 'physiotherapy', 'ambulance'];

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class QuoteController {
  @Get('quote') quote(@Query() q: any) {
    const channel = (q?.channel || 'clinic').toLowerCase();
    const price = Number(q?.price || 0);
    const withInsurance = q?.with_insurance === 'true' || q?.with_insurance === '1';
    const onlineOnly = ONLINE_ONLY_CHANNELS.includes(channel);

    const allowed_methods: string[] = [];
    if (withInsurance) allowed_methods.push('insurance');
    allowed_methods.push('online');
    if (!onlineOnly) allowed_methods.push('clinic_pay');

    return {
      service_type: q?.service_type || 'consultation',
      channel,
      price,
      currency: 'SAR',
      allowed_methods,
      insurance_applicable: true,
      notes_ar: onlineOnly
        ? 'هذه الخدمة تتطلب الدفع الإلكتروني مسبقًا'
        : 'يمكنك الدفع إلكترونيًا الآن أو نقدًا في العيادة عند الزيارة',
    };
  }
}

// ============================================================================
// Insurance flow service + controllers (BR-2)
// ============================================================================

@Injectable()
export class InsuranceFlowService {
  constructor(
    @InjectModel('InsuranceServiceRequest') private requests: Model<any>,
    @InjectModel('InsuranceCompany') private companies: Model<InsuranceCompanyDocument>,
    @InjectModel('PatientProfile') private patients: Model<any>,
    private events: EventEmitter2,
    @InjectModel('Transaction') private transactions: Model<any>,
    @InjectModel('Order') private orders: Model<any>,
    @InjectModel('LabBooking') private labs: Model<any>,
    @InjectModel('RadiologyBooking') private radiology: Model<any>,
    @InjectModel('HomeCareBooking') private homeCare: Model<any>,
    @InjectModel(Appointment.name) private appointments: Model<any>,
  ) {}

  private push(req: any, state: string, by: string, note?: string) {
    req.state = state;
    req.history = [...(req.history || []), { state, at: new Date(), by, note }];
  }

  async companiesList() {
    return this.companies.find({ is_active: true }, { _id: 0, __v: 0 }).lean();
  }

  async savePolicy(user: any, body: any) {
    if (!body?.company_id) throw new BadRequestException('company_id is required');
    const company = await this.companies.findOne({ id: body.company_id }).lean();
    if (!company) throw new NotFoundException('insurance company not found');
    const policy = {
      company_id: body.company_id,
      company_name: (company as any).name_ar || (company as any).name,
      plan_class: body.plan_class,
      member_id: body.member_id,
      policy_number: body.policy_number,
      card_image_url: body.card_image_url,
      saved_at: new Date(),
    };
    await this.patients.updateOne({ user_id: user.id }, { $set: { insurance: policy } }, { upsert: true });
    return { ok: true, policy };
  }

  async myPolicy(user: any) {
    const p = await this.patients.findOne({ user_id: user.id }, { _id: 0, insurance: 1 }).lean();
    const ins: any = (p as any)?.insurance || null;
    // company_id (new saves) OR provider (legacy saves) both count as a policy
    return { has_policy: !!(ins && (ins.company_id || ins.provider || ins.policy_number)), policy: ins };
  }

  private bookingModel(kind: string): { kind: string; model: Model<any> } {
    const value = String(kind || '').trim().toLowerCase();
    if (['pharmacy', 'order', 'orders'].includes(value)) return { kind: 'pharmacy', model: this.orders };
    if (['lab', 'labs'].includes(value)) return { kind: 'lab', model: this.labs };
    if (['radiology', 'rads'].includes(value)) return { kind: 'radiology', model: this.radiology };
    if (['nursing', 'home_care', 'home-care', 'homecare'].includes(value)) return { kind: 'nursing', model: this.homeCare };
    if (['consultation', 'appointment', 'appt'].includes(value)) return { kind: 'consultation', model: this.appointments };
    throw new BadRequestException('invalid_booking_kind');
  }

  async createRequest(user: any, body: any) {
    const bookingId = String(body?.booking_id || '').trim();
    if (!bookingId) throw new BadRequestException('booking_id_required');
    const { kind, model } = this.bookingModel(body?.booking_kind);
    const booking: any = await model.findOne({ id: bookingId, patient_id: user.id }).lean();
    if (!booking) throw new NotFoundException('owned_booking_not_found');
    const providerId = booking.provider_id || booking.doctor_user_id || booking.pharmacy_id || booking.facility_id;
    if (!providerId) throw new BadRequestException('booking_provider_assignment_required');
    const price = Number(booking.total ?? booking.total_price ?? booking.price ?? 0);
    if (!Number.isFinite(price) || price <= 0) throw new BadRequestException('booking_price_not_ready');
    const { has_policy, policy } = await this.myPolicy(user);
    if (!has_policy) throw new BadRequestException('NO_INSURANCE_POLICY'); // patient app redirects to add-policy then deep-returns (BR-2.2)
    const existing = await this.requests.findOne({ patient_id: user.id, booking_kind: kind, booking_id: bookingId, state: { $in: ['PENDING_PROVIDER_REVIEW', 'COPAY_PENDING', 'APPROVED_FULL', 'COPAY_PAID'] } }).lean();
    if (existing) return existing;
    const doc = await this.requests.create({
      patient_id: user.id, patient_name: user.full_name,
      provider_id: providerId,
      booking_id: bookingId, booking_kind: kind,
      service_type: booking.service_type || kind, channel: booking.channel || booking.visit_type || booking.service_location,
      price, policy,
      history: [{ state: 'PENDING_PROVIDER_REVIEW', at: new Date(), by: user.id }],
    });
    this.events.emit('insurance.requested', { request_id: doc.id, provider_id: doc.provider_id });
    return doc.toObject();
  }

  /** Patient resubmits a rejected request with new documents (BR-INS-7). */
  async resubmit(user: any, id: string, body: { documents?: any[]; note?: string }) {
    const req = await this.requests.findOne({ id });
    if (!req) throw new NotFoundException('request not found');
    if (req.patient_id !== user.id) throw new ForbiddenException();
    if (!['REJECTED', 'CANCELLED'].includes(req.state)) {
      throw new BadRequestException(`cannot resubmit in state ${req.state}`);
    }
    const resubmission_count = (req.resubmission_count || 0) + 1;
    if (resubmission_count > 3) throw new BadRequestException('max_resubmissions_reached (3)');
    req.resubmission_count = resubmission_count;
    if (body?.documents) req.documents = [...(req.documents || []), ...body.documents];
    req.rejection_reason = null;
    this.push(req, 'PENDING_PROVIDER_REVIEW', user.id, `resubmission #${resubmission_count}${body?.note ? ': ' + body.note : ''}`);
    await req.save();
    this.events.emit('insurance.resubmitted', { request_id: req.id, patient_id: req.patient_id, provider_id: req.provider_id, count: resubmission_count });
    return req.toObject();
  }

  /** Patient appeals a rejection (separate formal review track, BR-INS-8). */
  async appeal(user: any, id: string, body: { reason: string; documents?: any[] }) {
    const req = await this.requests.findOne({ id });
    if (!req) throw new NotFoundException('request not found');
    if (req.patient_id !== user.id) throw new ForbiddenException();
    if (req.state !== 'REJECTED') throw new BadRequestException(`cannot appeal in state ${req.state}`);
    if (!body?.reason?.trim()) throw new BadRequestException('appeal reason is required');
    if (req.appeal) throw new BadRequestException('appeal already filed for this request');
    req.appeal = {
      reason: body.reason.trim(),
      documents: body.documents || [],
      state: 'PENDING_ADMIN_REVIEW',
      filed_at: new Date(),
      filed_by: user.id,
    };
    this.push(req, 'APPEAL_PENDING', user.id, 'appeal filed');
    await req.save();
    this.events.emit('insurance.appeal_filed', { request_id: req.id, patient_id: req.patient_id });
    return req.toObject();
  }

  async myRequests(user: any) {
    return this.requests.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean();
  }

  async providerQueue(user: any, state?: string) {
    const filter: any = { provider_id: user.id };
    if (state) filter.state = state; else filter.state = { $in: ['PENDING_PROVIDER_REVIEW', 'COPAY_PENDING', 'COPAY_PAID'] };
    return this.requests.find(filter, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean();
  }

  /** M5: admin supervision queue — all requests, optionally filtered by state. */
  adminAll(state?: string) {
    const filter: any = state ? { state } : {};
    return this.requests.find(filter, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200).lean();
  }

  /** M5: admin stats — counts + sums grouped by state. */
  async adminStats() {
    const rows = await this.requests.aggregate([
      { $group: { _id: '$state', count: { $sum: 1 }, total_price: { $sum: '$price' }, total_copay: { $sum: { $ifNull: ['$copay_amount', 0] } } } },
    ]);
    const by_state: Record<string, any> = {};
    for (const r of rows) by_state[r._id] = { count: r.count, total_price: r.total_price, total_copay: r.total_copay };
    return { by_state, total: rows.reduce((s, r) => s + r.count, 0) };
  }

  async getOne(id: string, user: any) {
    const req = await this.requests.findOne({ id }, { _id: 0, __v: 0 }).lean();
    if (!req) throw new NotFoundException('request not found');
    if ((req as any).patient_id !== user.id && (req as any).provider_id !== user.id && user.role !== 'admin') throw new ForbiddenException();
    return req;
  }

  /** Provider manual decision (BR-2.4): full | partial(copay_percent) | reject(reason). */
  async decide(user: any, id: string, body: any) {
    const req = await this.requests.findOne({ id });
    if (!req) throw new NotFoundException('request not found');
    if (req.provider_id !== user.id && user.role !== 'admin') throw new ForbiddenException();
    if (req.state !== 'PENDING_PROVIDER_REVIEW') throw new BadRequestException(`request already decided (${req.state})`);

    const decision = body?.decision;
    if (decision === 'approve_full') {
      this.push(req, 'APPROVED_FULL', user.id);
      req.copay_percent = 0; req.copay_amount = 0;
    } else if (decision === 'approve_partial') {
      const pct = Number(body?.copay_percent);
      if (!pct || pct <= 0 || pct >= 100) throw new BadRequestException('copay_percent must be between 1 and 99');
      this.push(req, 'COPAY_PENDING', user.id, `patient copay ${pct}%`);
      req.copay_percent = pct;
      req.copay_amount = Math.round(req.price * (pct / 100) * 100) / 100;
    } else if (decision === 'reject') {
      if (!body?.reason?.trim()) throw new BadRequestException('rejection reason is required');
      this.push(req, 'REJECTED', user.id, body.reason.trim());
      req.rejection_reason = body.reason.trim();
    } else {
      throw new BadRequestException('decision must be approve_full | approve_partial | reject');
    }
    req.decided_by = user.id; req.decided_at = new Date();
    await req.save();
    this.events.emit('insurance.decided', { request_id: req.id, patient_id: req.patient_id, state: req.state, copay_amount: req.copay_amount });
    return req.toObject();
  }

  /** Patient pays only the copay (BR-2.5→2.6). Service starts only after this. */
  async payCopay(user: any, id: string, body: any) {
    const req = await this.requests.findOne({ id });
    if (!req) throw new NotFoundException('request not found');
    if (req.patient_id !== user.id) throw new ForbiddenException();
    if (req.state === 'APPROVED_FULL') {
      this.push(req, 'COPAY_PAID', user.id, 'no copay due');
    } else if (req.state === 'COPAY_PENDING') {
      const paymentId = String(body?.payment_id || '').trim();
      if (!paymentId) throw new BadRequestException('verified_payment_id_required');
      const payment: any = await this.transactions.findOne({
        id: paymentId,
        patient_id: req.patient_id,
        booking_kind: 'insurance',
        booking_id: req.id,
        status: 'paid',
      }).lean();
      if (!payment || Number(payment.amount) !== Number(req.copay_amount)) throw new BadRequestException('verified_copay_payment_required');
      req.payment_id = payment.id;
      this.push(req, 'COPAY_PAID', user.id, `verified payment ${payment.id}`);
      req.copay_paid_at = new Date();
    } else {
      throw new BadRequestException(`cannot pay copay in state ${req.state}`);
    }
    await req.save();
    this.events.emit('insurance.copay.paid', { request_id: req.id, provider_id: req.provider_id, patient_id: req.patient_id });
    return req.toObject();
  }

  /** The payment event is the normal post-checkout settlement path; it cannot be faked by a client body. */
  @OnEvent('payment.completed')
  async settleVerifiedCopay(event: any) {
    if (event?.booking_kind !== 'insurance' || !event?.transaction_id) return;
    const req = await this.requests.findOne({ id: event.booking_id, patient_id: event.patient_id, state: 'COPAY_PENDING' });
    if (!req) return;
    const payment: any = await this.transactions.findOne({
      id: event.transaction_id,
      patient_id: req.patient_id,
      booking_kind: 'insurance',
      booking_id: req.id,
      status: 'paid',
    }).lean();
    if (!payment || Number(payment.amount) !== Number(req.copay_amount)) return;
    req.payment_id = payment.id;
    req.copay_paid_at = new Date();
    this.push(req, 'COPAY_PAID', 'system', `verified payment ${payment.id}`);
    await req.save();
    this.events.emit('insurance.copay.paid', { request_id: req.id, provider_id: req.provider_id, patient_id: req.patient_id });
  }

  async cancel(user: any, id: string) {
    const req = await this.requests.findOne({ id });
    if (!req) throw new NotFoundException('request not found');
    if (req.patient_id !== user.id) throw new ForbiddenException();
    if (['COPAY_PAID'].includes(req.state)) throw new BadRequestException('cannot cancel after payment');
    this.push(req, 'CANCELLED', user.id);
    await req.save();
    return { ok: true };
  }
}

@Controller('insurance')
@UseGuards(JwtAuthGuard)
export class InsuranceFlowController {
  constructor(private readonly svc: InsuranceFlowService) {}

  // ---- patient ----
  @Get('companies') companies() { return this.svc.companiesList(); }
  @Post('save-policy') savePolicy(@CurrentUser() u: any, @Body() b: any) { return this.svc.savePolicy(u, b); }
  @Get('my-policy') myPolicy(@CurrentUser() u: any) { return this.svc.myPolicy(u); }

  @Get('coverage-check') async coverageCheck(@CurrentUser() u: any, @Query() q: any) {
    const { has_policy, policy } = await this.svc.myPolicy(u);
    return {
      eligible: has_policy,
      policy,
      service_type: q?.service_type || 'consultation',
      note_ar: has_policy
        ? 'التغطية النهائية يحددها مزود الخدمة عند مراجعة الطلب'
        : 'لا توجد وثيقة تأمين في ملفك — أضفها أولًا',
    };
  }

  @Get('benefits-summary') async benefits(@CurrentUser() u: any) {
    const { has_policy, policy } = await this.svc.myPolicy(u);
    return { has_policy, policy, benefits: has_policy ? [{ key: 'manual_review', note_ar: 'تخضع الموافقة لمراجعة مزود الخدمة لوثيقتك' }] : [] };
  }

  @Post('requests') createRequest(@CurrentUser() u: any, @Body() b: any) { return this.svc.createRequest(u, b); }
  @Get('requests/my') myRequests(@CurrentUser() u: any) { return this.svc.myRequests(u); }
  @Get('requests/:id') one(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.getOne(id, u); }
  @Post('requests/:id/pay-copay') payCopay(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.payCopay(u, id, b); }
  @Post('requests/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancel(u, id); }
  @Post('requests/:id/resubmit') resubmit(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.resubmit(u, id, b); }
  @Post('requests/:id/appeal') appeal(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.appeal(u, id, b); }

  // ---- provider ----
  @Get('requests/provider/queue') providerQueue(@CurrentUser() u: any, @Query('state') state?: string) { return this.svc.providerQueue(u, state); }
  @Post('requests/:id/decide') decide(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.decide(u, id, b); }

  // ---- legacy aliases the patient app already calls ----
  @Post('payment-confirm') paymentConfirm(@CurrentUser() u: any, @Body() b: any) {
    return this.svc.payCopay(u, b?.request_id || b?.id, b);
  }

  // M4 alias: patient claim-tracking screens call /insurance/claims/*
  @Get('claims/my') claimsMy(@CurrentUser() u: any) { return this.svc.myRequests(u); }
}

// Patient-app aliases: POST /patient/pay-copay, POST /home-care/insurance/verify
@Controller()
@UseGuards(JwtAuthGuard)
export class InsuranceAliasController {
  constructor(private readonly svc: InsuranceFlowService) {}

  @Post('patient/pay-copay') payCopay(@CurrentUser() u: any, @Body() b: any) {
    return this.svc.payCopay(u, b?.request_id || b?.id, b);
  }

  @Post('home-care/insurance/verify') verify(@CurrentUser() u: any) {
    return this.svc.myPolicy(u);
  }
}

// ============================================================================
// Refunds (policy windows) + finance admin surface
// ============================================================================

const REFUND_WINDOWS = [
  { hours_before: 24, percent: 100, note_ar: 'إلغاء قبل أكثر من 24 ساعة — استرداد كامل' },
  { hours_before: 4, percent: 50, note_ar: 'إلغاء قبل 4–24 ساعة — استرداد 50%' },
  { hours_before: 0, percent: 0, note_ar: 'إلغاء قبل أقل من 4 ساعات أو عدم الحضور — لا استرداد' },
];

@Injectable()
export class RefundService {
  constructor(
    @InjectModel('RefundRequest') private refunds: Model<any>,
    private events: EventEmitter2,
    private readonly fraud: FraudService,
  ) {}

  policyFor(scheduledAt?: Date) {
    if (!scheduledAt) return REFUND_WINDOWS[0];
    const hours = (new Date(scheduledAt).getTime() - Date.now()) / 3600000;
    for (const w of REFUND_WINDOWS) if (hours >= w.hours_before) return w;
    return REFUND_WINDOWS[REFUND_WINDOWS.length - 1];
  }

  async request(user: any, body: any) {
    if (!body?.booking_id) throw new BadRequestException('booking_id is required');
    const paid = Number(body?.amount_paid || 0);
    if (paid <= 0) throw new BadRequestException('amount_paid must be positive');
    if (!body?.reason || typeof body.reason !== 'string' || !body.reason.trim()) throw new BadRequestException('reason is required');
    const dup = await this.refunds.findOne({ booking_id: body.booking_id, state: { $ne: 'REJECTED' } });
    if (dup) return dup.toObject();
    // E1 S15: refund-abuse detection — frequent refunders are flagged for admin review
    await this.fraud.checkRefundAbuse(user.id).catch(() => false);
    const policy = this.policyFor(body?.scheduled_at ? new Date(body.scheduled_at) : undefined);
    const doc = await this.refunds.create({
      patient_id: user.id, booking_id: body.booking_id, booking_kind: body.booking_kind,
      amount_paid: paid, refund_percent: policy.percent,
      refund_amount: Math.round(paid * (policy.percent / 100) * 100) / 100,
      policy_note_ar: policy.note_ar, reason: body?.reason,
      moyasar_payment_id: body?.payment_id,
      history: [{ state: 'REQUESTED', at: new Date(), by: user.id }],
    });
    this.events.emit('refund.requested', { refund_id: doc.id });
    return doc.toObject();
  }

  myRefunds(user: any) {
    return this.refunds.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean();
  }

  adminQueue() {
    return this.refunds.find({ state: 'REQUESTED' }, { _id: 0, __v: 0 }).sort({ createdAt: 1 }).limit(100).lean();
  }

  async decide(user: any, id: string, approve: boolean, note?: string) {
    const r = await this.refunds.findOne({ id });
    if (!r) throw new NotFoundException('refund not found');
    if (r.state !== 'REQUESTED') throw new BadRequestException(`already ${r.state}`);
    r.state = approve ? 'APPROVED' : 'REJECTED';
    r.history.push({ state: r.state, at: new Date(), by: user.id, note });
    await r.save();
    return r.toObject();
  }
}

@Controller('refunds')
@UseGuards(JwtAuthGuard)
export class RefundController {
  constructor(private readonly svc: RefundService) {}
  @Post('request') request(@CurrentUser() u: any, @Body() b: any) { return this.svc.request(u, b); }
  @Get('my') my(@CurrentUser() u: any) { return this.svc.myRefunds(u); }
  @Get('policy-preview') preview(@Query('scheduled_at') s?: string) {
    const w = this.svc.policyFor(s ? new Date(s) : undefined);
    return { refund_percent: w.percent, note_ar: w.note_ar, windows: REFUND_WINDOWS };
  }
}

@Controller('admin/finance')
@UseGuards(JwtAuthGuard)
export class AdminFinanceCoreController {
  constructor(
    private readonly refunds: RefundService,
    private readonly finance: FinanceCoreService,
  ) {}
  @Get('ledger/summary') summary() { return this.finance.platformSummary(); }
  @Get('refunds/queue') refundsQueue() { return this.refunds.adminQueue(); }
  @Post('refunds/:id/decide') decideRefund(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    return this.refunds.decide(u, id, b?.approve === true, b?.note);
  }
}

@Controller('admin/insurance')
@UseGuards(JwtAuthGuard)
export class AdminInsuranceController {
  constructor(private readonly svc: InsuranceFlowService) {}
  @Get('requests') all(@Query('state') state?: string) { return this.svc.adminAll(state); }
  @Get('stats') stats() { return this.svc.adminStats(); }
}

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceCoreController {
  constructor(private readonly finance: FinanceCoreService) {}
  /** Internal hook: record commission when an order/booking is paid. */
  @Post('ledger/accrue') accrue(@Body() b: any) { return this.finance.accrue(b); }
  @Get('ledger/provider/summary') providerSummary(@CurrentUser() u: any) { return this.finance.providerSummary(u.id); }
}

// ============================================================================
// Module
// ============================================================================

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'InsuranceServiceRequest', schema: InsuranceServiceRequestSchema },
      { name: 'RefundRequest', schema: RefundRequestSchema },
      { name: 'PlatformLedgerEntry', schema: PlatformLedgerEntrySchema },
      { name: 'CommissionRule', schema: CommissionRuleSchema },
      { name: 'InsuranceCompany', schema: InsuranceCompanySchema },
      { name: 'PatientProfile', schema: PatientProfileSchema },
      { name: 'Transaction', schema: TransactionSchema },
      { name: 'Order', schema: OrderSchema },
      { name: 'LabBooking', schema: LabBookingSchema },
      { name: 'RadiologyBooking', schema: RadiologyBookingSchema },
      { name: 'HomeCareBooking', schema: HomeCareBookingSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
  ],
  controllers: [
    QuoteController, InsuranceFlowController, InsuranceAliasController,
    RefundController, AdminFinanceCoreController, FinanceCoreController, AdminInsuranceController,
  ],
  providers: [InsuranceFlowService, FinanceCoreService, RefundService],
  exports: [InsuranceFlowService, FinanceCoreService, RefundService],
})
export class InsuranceEngineModule {}
