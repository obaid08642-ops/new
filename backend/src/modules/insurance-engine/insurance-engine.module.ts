import { PROVIDER_ROLES } from '../../common/enums';
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
import { Module, Controller, Injectable, Get, Post, Body, Param, Query, UseGuards, NotFoundException, BadRequestException, ForbiddenException, ConflictException, Optional, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectConnection, InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { StepUp } from '../../common/step-up.guard';
import { JwtAuthGuard, CurrentUser, SelfService, Roles } from '../../common/auth.guard';
import { InsuranceCompanySchema, InsuranceCompanyDocument } from '../../schemas/insurance.schema';
import { PatientProfileSchema } from '../../schemas/patient-profile.schema';
import { ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { hasInsuranceContract, policyClass, policyCompanyKeys } from '../../common/insurance-policy';
import { FraudService, RefundExecutor } from '../finance-engine/finance-engine.module';
import { TransactionSchema } from '../../schemas/transaction.schema';
import { OrderSchema } from '../../schemas/order.schema';
import { LabBookingSchema } from '../../schemas/lab.schema';
import { RadiologyBookingSchema } from '../../schemas/radiology.schema';
import { HomeCareBookingSchema } from '../../schemas/home-care.schema';
import { Appointment, AppointmentSchema } from '../../schemas/appointment.schema';
import { UserRole } from '../../common/enums';
import { SavePolicyDto, CreateRequestDto, PayCopayDto, ResubmitDto, AppealDto, DecideDto, GatekeeperDto, PaymentConfirmDto, PayCopayDto2, RequestDto, DecideRefundDto, AccrueDto } from './insurance-engine.dto';
import { Permission, RequirePermissions } from '../../common/permissions';

// ============================================================================
// Schemas
// ============================================================================

/**
 * Batch 7 insurance, chunk oc/E-ins-2 (#835). The request states the engine **actually writes**,
 * published so the clients build their enum from the server instead of guessing.
 *
 * Measured against `push()` call sites: these 7 and no others. Two further values are declared
 * on the schema for forward compatibility but nothing writes them, so they are listed
 * separately rather than advertised as live:
 *  - `APPROVED_PARTIAL` - a partial decision goes straight to `COPAY_PENDING`;
 *  - `EXPIRED`         - declared only.
 *
 * patient-web's parser (`lib/api/insurance-request.ts:4`) lists `SELF_PAY_PENDING` and
 * `SELF_PAY_PAID`, which the engine never produces, and omits `APPEAL_PENDING`, which it does -
 * so an appealed request renders "Unable to load insurance". That parser is the design
 * session's; this list is what it should be built from.
 */
export const INSURANCE_REQUEST_STATES = [
  'PENDING_PROVIDER_REVIEW',
  'APPROVED_FULL',
  'COPAY_PENDING',
  'COPAY_PAID',
  'REJECTED',
  'APPEAL_PENDING',
  'CANCELLED',
] as const;

/** Declared on the schema but never written. See the note above. */
export const INSURANCE_REQUEST_RESERVED_STATES = ['APPROVED_PARTIAL', 'EXPIRED'] as const;


@Schema({ timestamps: true })
export class InsuranceServiceRequest {
  // Written by the services but previously undeclared: strict mode silently dropped it (tools/audit/schemadrift.js).
  @Prop() insurer_approval_code?: string;
  @Prop() approval_ref?: string;
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
  // Written by payments verify / finance refunds through a dynamically chosen model (strict mode dropped them).
  @Prop() payment_status?: string;              // paid | refunded | partially_refunded (payments verify / finance refund)
  @Prop() transaction_id?: string;
  @Prop() paid_at?: Date;
  @Prop() refund_status?: string;
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
  pharmacy: 0.10, lab: 0.12, radiology: 0.12, default: 0.15,
};

@Injectable()
export class FinanceCoreService {
  constructor(
    @InjectModel('PlatformLedgerEntry') private ledger: Model<any>,
    @InjectModel('CommissionRule') private rules: Model<any>,
  ) {}

  async rateFor(serviceType: string): Promise<number> {
    const rule = await this.rules.findOne({ service_type: { $eq: serviceType }, active: true }).lean();
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

const ONLINE_ONLY_CHANNELS = ['online', 'video', 'audio', 'chat', 'home', 'home_visit', 'delivery', 'nursing', 'physiotherapy'];

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
  private readonly logger = new Logger('InsuranceFlowService');
  constructor(
    @InjectModel('InsuranceServiceRequest') private requests: Model<any>,
    @InjectModel('InsuranceCompany') private companies: Model<InsuranceCompanyDocument>,
    @InjectModel('PatientProfile') private patients: Model<any>,
    @InjectModel('ProviderProfile') private providerModel: Model<any>,
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

  async savePolicy(user: any, body: any) {
    if (!body?.company_id) throw new BadRequestException('company_id is required');
    // add-policy.tsx sends the company code; other clients send the id
    const key = String(body.company_id);
    const company = await this.companies.findOne({ $or: [{ id: { $eq: key } }, { code: { $eq: key.toLowerCase() } }], is_active: true }).lean();
    if (!company) throw new NotFoundException('insurance company not found');
    // The figures printed on the card (optional): the estimate before booking uses them. Validated, never guessed.
    const copayPercent = body.copay_percent;
    const copayCap = body.copay_cap_sar;
    if (copayPercent !== undefined && copayPercent !== null && !(typeof copayPercent === 'number' && copayPercent >= 0 && copayPercent <= 100)) throw new BadRequestException('invalid_copay_percent');
    if (copayCap !== undefined && copayCap !== null && !(typeof copayCap === 'number' && copayCap >= 0 && copayCap <= 1_000_000)) throw new BadRequestException('invalid_copay_cap');
    // `verified` is never taken from the client: verification is a separate server/admin step
    const policy = {
      company_id: (company as any).id,
      company_code: (company as any).code,
      company_name: (company as any).name_ar || (company as any).name,
      provider: (company as any).name_ar || (company as any).name_en || (company as any).code,
      plan_class: body.plan_class || body.class,
      network: body.network,
      member_id: body.member_id,
      member_name: body.member_name,
      national_id: body.national_id,
      policy_number: body.policy_number,
      expiry_date: body.expiry_date,
      ...(typeof copayPercent === 'number' ? { copay_percent: copayPercent } : {}),
      ...(typeof copayCap === 'number' ? { copay_cap_sar: copayCap } : {}),
      card_image_url: body.card_image_url,
      ocr_extracted: !!body.ocr_extracted,
      verified: false,
      saved_at: new Date(),
    };
    await this.patients.updateOne({ user_id: user.id }, { $set: { insurance: policy } }, { upsert: true });
    return { ok: true, policy };
  }

  async myPolicy(user: any) {
    const p = await this.patients.findOne({ user_id: user.id }, { _id: 0, insurance: 1 }).lean();
    const ins: any = (p as any)?.insurance || null;
    // company_id (new saves) OR provider (legacy saves) both count as a policy
    const has_policy = !!(ins && (ins.company_id || ins.provider || ins.policy_number));
    if (!has_policy) return { has_policy, policy: ins };
    // #838: the card shows the insurer's logo (a verified catalogue logo only), the membership number and the expiry,
    // all as saved; nothing is invented when the patient did not enter it.
    const company: any = ins.company_id
      ? await this.companies.findOne({ id: { $eq: String(ins.company_id) } }, { _id: 0, logo_url: 1, logo_verified_at: 1, name_en: 1 }).lean()
      : null;
    const policy = {
      ...ins,
      company_logo_url: company?.logo_url && company?.logo_verified_at ? company.logo_url : null,
      company_name_en: company?.name_en ?? null,
      member_id: ins.member_id ?? null,
      expiry_date: ins.expiry_date ?? null,
      // Design parity (#1819): the insurer id the booking forms send (insurance_provider): the catalogue company, else the
      // legacy saved provider name; null when neither was saved.
      insurer_id: ins.company_id ? String(ins.company_id) : (typeof ins.provider === 'string' && ins.provider ? ins.provider : null),
    };
    return { has_policy, policy };
  }

  /**
   * Batch 7 insurance, chunk oc/E-ins-1 (#829, #845, #837).
   *
   * Relay-only (decision 35 / D-37): this reads the **saved policy** and nothing else. It does
   * not ask an insurer anything, so the answer must not read like a live check.
   *
   *  - `note_code` replaces the hard-coded Arabic `note_ar` sentence (queue §2 step 5: send a
   *    code, let the client translate it). `note_ar` is left for the two patient-web readers
   *    that call it today (`lib/insurance/view.ts:51,60`); the design session switches them to
   *    `note_code` and the Arabic field can then go.
   *  - `has_policy` is the neutral name for what `eligible` always meant ("a policy is on
   *    file"). `eligible` is kept because the clients read it; the two always agree.
   *  - `live_check: false` says out loud that nothing was checked with an insurer, and no
   *    `nphies_*` field is returned.
   */
  async coverageCheckAnswer(user: any, query: any) {
    const { has_policy, policy } = await this.myPolicy(user);
    return {
      eligible: has_policy,
      has_policy,
      policy,
      service_type: query?.service_type || 'consultation',
      live_check: false,
      note_code: has_policy ? 'coverage_decided_by_provider' : 'no_policy_on_file',
      note_ar: has_policy
        ? 'التغطية النهائية يحددها مزود الخدمة عند مراجعة الطلب'
        : 'لا توجد وثيقة تأمين في ملفك — أضفها أولًا',
    };
  }

  /**
   * Batch 7 insurance, chunk oc/E-ins-1 (#836).
   *
   * Benefits rows carry a stable `key` the client translates. There is no benefit amount,
   * limit or usage anywhere in the platform, so none is invented here: until the owner
   * supplies real plan limits this row is only the "who decides coverage" notice.
   */
  async benefitsAnswer(user: any) {
    const { has_policy, policy } = await this.myPolicy(user);
    return {
      has_policy,
      policy,
      benefits: has_policy
        ? [{ key: 'manual_review', note_code: 'coverage_decided_by_provider', amounts_available: false }]
        : [],
      // #823/#826: the patient's own insurance use (approval requests, not claims: decision 35 is relay-only), summed from their decided requests (never a made-up limit). There is
      // no plan limit in the platform, so `annual_limit` is null rather than a fixed figure; `expiry_date` is the policy's.
      usage: has_policy ? await this.usageTotals(user.id) : null,
      annual_limit: null,
      expiry_date: policy?.expiry_date ?? null,
    };
  }

  /** Totals of the patient's decided insurance requests: how many, what the insurer covered and what the patient paid. */
  private async usageTotals(patientId: string) {
    const rows: any[] = await this.requests.find(
      { patient_id: patientId, state: { $in: ['APPROVED_FULL', 'APPROVED_PARTIAL', 'COPAY_PENDING', 'COPAY_PAID', 'REJECTED'] } },
      { _id: 0, state: 1, price: 1, copay_amount: 1 },
    ).limit(1000).lean();
    let covered = 0;
    let patientShare = 0;
    let approved = 0;
    for (const r of rows) {
      if (r.state === 'REJECTED') continue;
      approved += 1;
      const price = Number(r.price) || 0;
      const share = r.state === 'APPROVED_FULL' ? 0 : Math.min(price, Number(r.copay_amount) || 0);
      covered += price - share;
      patientShare += share;
    }
    const round = (n: number) => Math.round(n * 100) / 100;
    return { requests: rows.length, approved, rejected: rows.length - approved, insurer_covered: round(covered), patient_share: round(patientShare), currency: 'SAR' };
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
    const booking: any = await model.findOne({ id: { $eq: bookingId }, patient_id: { $eq: user.id } }).lean();
    if (!booking) throw new NotFoundException('owned_booking_not_found');
    const providerId = booking.provider_id || booking.provider_account_id || booking.doctor_user_id || booking.pharmacy_id || booking.facility_id || booking.lab_id || booking.radiology_center_id || booking.nurse_id;
    if (!providerId) throw new BadRequestException('booking_provider_assignment_required');
    const price = Number(booking.total ?? booking.total_price ?? booking.price ?? 0);
    if (!Number.isFinite(price) || price <= 0) throw new BadRequestException('booking_price_not_ready');
    const { has_policy, policy } = await this.myPolicy(user);
    if (!has_policy) throw new BadRequestException('NO_INSURANCE_POLICY'); // patient app redirects to add-policy then deep-returns (BR-2.2)

    // A retry or a poll of a request that already exists returns it, even if the provider's contracts changed since.
    const existing = await this.requests.findOne({ patient_id: user.id, booking_kind: kind, booking_id: bookingId, state: { $in: ['PENDING_PROVIDER_REVIEW', 'COPAY_PENDING', 'APPROVED_FULL', 'COPAY_PAID'] } }).lean();
    if (existing) return existing;
    // D-30: the provider must hold an active contract for the patient's company AND class. Fails closed:
    // a policy without a company or a class, or a provider without contracts, is refused.
    const companyKeys = policyCompanyKeys(policy);
    const policyCls = policyClass(policy);
    if (!companyKeys.length || !policyCls) throw new BadRequestException('insurance_class_required');
    // A booking names its provider by profile id or by account id, depending on the service.
    const providerProfile: any = await this.providerModel.findOne({
      $or: [{ id: { $eq: providerId } }, { user_id: { $eq: providerId } }, { account_id: { $eq: providerId } }],
    }).lean();
    if (!hasInsuranceContract(providerProfile?.insurance_class_contracts, companyKeys, policyCls)) throw new ConflictException('insurance_not_accepted_by_provider');

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
    const req = await this.requests.findOne({ id: { $eq: id } });
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
    const req = await this.requests.findOne({ id: { $eq: id } });
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

  /**
   * Batch 7 insurance, chunk oc/E-ins-2 (#830 / #846): one approval number on the read side.
   *
   * D-37 already unified the write - `decide()` stores exactly one field, `insurer_approval_code`.
   * Both clients read `approval_code ?? insurer_approval_code`, and `approval_code` is never
   * written, so the read always fell through to the same field anyway. The D-37 canonical name
   * `approval_ref` is now mirrored from that one stored value, so the two names can never
   * disagree and a future client change can collapse to a single name.
   */
  private presentRequest(req: any): any {
    if (!req || typeof req !== 'object') return req;
    // older rows written by the provider-request path carry `approval_code`; it is read as the same number
    const code = [req.insurer_approval_code, req.approval_ref, req.approval_code].find((v) => typeof v === 'string' && v.trim());
    // #825: the insurer's share is the server's figure (price minus the patient's share), not a client computation
    const price = Number(req.price);
    const share = req.state === 'APPROVED_FULL' ? 0 : Number(req.copay_amount);
    const insurer_share = Number.isFinite(price) && price > 0 && Number.isFinite(share) && ['APPROVED_FULL', 'APPROVED_PARTIAL', 'COPAY_PENDING', 'COPAY_PAID'].includes(req.state)
      ? Math.round((price - Math.min(price, share)) * 100) / 100 : undefined;
    const { approval_code: _legacy, ...rest } = req;
    return { ...rest, ...(code ? { approval_ref: code.trim(), insurer_approval_code: code.trim() } : {}), ...(insurer_share !== undefined ? { insurer_share } : {}) };
  }

  async myRequests(user: any) {
    const rows = await this.requests.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean();
    return (rows as any[]).map((r) => this.presentRequest(r));
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
    const req = await this.requests.findOne({ id: { $eq: id } }, { _id: 0, __v: 0 }).lean();
    if (!req) throw new NotFoundException('request not found');
    if ((req as any).patient_id !== user.id && (req as any).provider_id !== user.id && user.role !== 'admin') throw new ForbiddenException();
    return this.presentRequest(req);
  }

    /** Doctor gatekeeper for consultation insurance (provider-app sheet):
   * finds-or-creates the request for the appointment, then applies the
   * decision. Body: {status: approved|rejected, copay, coverage, approval_code}. */
  async gatekeeperDecision(user: any, appointmentId: string, body: any) {
    const appt: any = await this.appointments.findOne({ id: { $eq: appointmentId } }).lean();
    if (!appt) throw new NotFoundException('appointment not found');
    const ownerIds = [appt.doctor_user_id, appt.doctor_id].filter(Boolean).map(String);
    if (!ownerIds.includes(String(user.id))) throw new ForbiddenException();
    let req: any = await this.requests.findOne({ booking_kind: 'consultation', booking_id: appointmentId, state: { $in: ['PENDING_PROVIDER_REVIEW', 'COPAY_PENDING', 'APPROVED_FULL', 'COPAY_PAID'] } });
    if (!req) {
      const price = Number(appt.total_price ?? appt.price ?? 0);
      const pat: any = await this.patients.findOne({ user_id: appt.patient_id }).lean();
      const policy = pat?.insurance || null;
      if (!policy || !(policy.company_id || policy.provider || policy.policy_number)) throw new BadRequestException('NO_INSURANCE_POLICY');
      req = await this.requests.create({
        patient_id: appt.patient_id, provider_id: appt.doctor_user_id || appt.doctor_id,
        booking_id: appointmentId, booking_kind: 'consultation',
        service_type: appt.service_type, price, policy,
        history: [{ state: 'PENDING_PROVIDER_REVIEW', at: new Date(), by: user.id }],
      });
    }
    const status = String(body?.status || '').toLowerCase();
    const copay = Number(body?.copay ?? 0) || 0;
    const code = typeof body?.approval_code === 'string' ? body.approval_code.trim() : '';
    if (status === 'rejected') {
      const out = await this.decide(user, req.id, { decision: 'reject', reason: code || 'rejected by provider' });
      return out;
    }
    if (status !== 'approved') throw new BadRequestException('status must be approved|rejected');
    if (code) {
      await this.requests.updateOne({ id: req.id }, { $set: { insurer_approval_code: code } });
    }
    if (copay > 0) {
      const pct = Math.min(99, Math.max(1, Math.round((copay / Math.max(1, Number(req.price) || 1)) * 100)));
      return this.decide(user, req.id, { decision: 'approve_partial', copay_percent: pct, approval_ref: code });
    }
    return this.decide(user, req.id, { decision: 'approve_full', approval_ref: code });
  }

  /** LJ-03: one decision entry point for a provider on any service booking
   * (lab, radiology, consultation). Finds-or-creates the request from the
   * booking, checks the caller owns that booking, validates the decision and
   * delegates to `decide`. */
  async providerDecideBooking(user: any, bookingKind: string, bookingId: string, body: any) {
    const { kind, model } = this.bookingModel(bookingKind);
    const booking: any = await model.findOne({ id: { $eq: bookingId } }).lean();
    if (!booking) throw new NotFoundException('booking_not_found');
    const owners = [booking.provider_id, booking.provider_account_id, booking.doctor_user_id, booking.facility_id, booking.lab_id, booking.radiology_center_id, booking.nurse_id]
      .filter(Boolean).map(String);
    const callerIds = [user.id, user.parent_provider_account_id].filter(Boolean).map(String);
    if (user.role !== 'admin' && !owners.some((owner: string) => callerIds.includes(owner))) throw new ForbiddenException();

    let req: any = await this.requests.findOne({ booking_kind: kind, booking_id: bookingId, state: { $in: ['PENDING_PROVIDER_REVIEW', 'COPAY_PENDING', 'APPROVED_FULL', 'COPAY_PAID'] } });
    if (!req) {
      const price = Number(booking.total ?? booking.total_price ?? booking.price ?? 0);
      if (!Number.isFinite(price) || price <= 0) throw new BadRequestException('booking_price_not_ready');
      const pat: any = await this.patients.findOne({ user_id: booking.patient_id }).lean();
      const policy = pat?.insurance || null;
      if (!policy || !(policy.company_id || policy.provider || policy.policy_number)) throw new BadRequestException('NO_INSURANCE_POLICY');
      const providerId = owners.includes(String(user.id)) ? String(user.id) : owners[0];
      req = await this.requests.create({
        patient_id: booking.patient_id, provider_id: providerId,
        booking_id: bookingId, booking_kind: kind, service_type: booking.service_type || kind,
        price, policy, history: [{ state: 'PENDING_PROVIDER_REVIEW', at: new Date(), by: user.id }],
      });
      this.events.emit('insurance.requested', { request_id: req.id, provider_id: req.provider_id });
    }
    if (req.state !== 'PENDING_PROVIDER_REVIEW') return req.toObject();

    const decision = String(body?.decision || body?.status || '').trim().toLowerCase();
    // D-37: the insurer's approval number entered by the provider (approval_ref; approval_code and
    // decision_reference are the older names some provider screens send). decide() requires it to approve.
    const code = [body?.approval_ref, body?.approval_code, body?.decision_reference].find((v) => typeof v === 'string' && v.trim())?.trim() || '';
    if (code) await this.requests.updateOne({ id: req.id }, { $set: { insurer_approval_code: code } });
    if (['approved', 'approve_full', 'full', 'approved_full'].includes(decision)) return this.decide(user, req.id, { decision: 'approve_full', approval_ref: code });
    if (['partial', 'partial_approval', 'approve_partial'].includes(decision)) {
      const pct = Number(body?.copay_percent);
      const copay = Number(body?.copay ?? body?.totalCopay ?? 0) || 0;
      if (pct > 0) return this.decide(user, req.id, { decision: 'approve_partial', copay_percent: pct, approval_ref: code });
      if (copay > 0) {
        const computed = Math.min(99, Math.max(1, Math.round((copay / Math.max(1, Number(req.price) || 1)) * 100)));
        return this.decide(user, req.id, { decision: 'approve_partial', copay_percent: computed, approval_ref: code });
      }
      return this.decide(user, req.id, { decision: 'approve_full', approval_ref: code });
    }
    if (['rejected', 'reject'].includes(decision)) {
      const reason = String(body?.reason || body?.rejectReason || code || '').trim();
      if (!reason) throw new BadRequestException('rejection reason is required');
      return this.decide(user, req.id, { decision: 'reject', reason });
    }
    throw new BadRequestException('status must be approved|partial|rejected');
  }

  /** Provider manual decision (BR-2.4): full | partial(copay_percent) | reject(reason). */
  async decide(user: any, id: string, body: any) {
    const req = await this.requests.findOne({ id: { $eq: id } });
    if (!req) throw new NotFoundException('request not found');
    if (req.provider_id !== user.id && user.role !== 'admin') throw new ForbiddenException();
    if (req.state !== 'PENDING_PROVIDER_REVIEW') throw new BadRequestException(`request already decided (${req.state})`);

    const decision = body?.decision;
    if (decision === 'approve_full') {
      const approvalRef = typeof body?.approval_ref === 'string' ? body.approval_ref.trim() : '';
      if (!approvalRef) throw new BadRequestException('approval_ref is required for approve_full');
      this.push(req, 'APPROVED_FULL', user.id);
      req.copay_percent = 0; req.copay_amount = 0;
      req.approval_ref = approvalRef;
    } else if (decision === 'approve_partial') {
      const approvalRef = typeof body?.approval_ref === 'string' ? body.approval_ref.trim() : '';
      if (!approvalRef) throw new BadRequestException('approval_ref is required for approve_partial');
      const pct = Number(body?.copay_percent);
      const copayAmount = Number(body?.copay_amount);
      if ((!pct || pct <= 0 || pct >= 100) && (!copayAmount || copayAmount <= 0)) {
        throw new BadRequestException('copay_percent (1-99) or copay_amount (>0) is required for approve_partial');
      }
      this.push(req, 'COPAY_PENDING', user.id, `patient copay ${pct || copayAmount}%`);
      if (pct && pct > 0 && pct < 100) {
        req.copay_percent = pct;
        req.copay_amount = Math.round(req.price * (pct / 100) * 100) / 100;
      } else if (copayAmount && copayAmount > 0) {
        req.copay_amount = Math.round(copayAmount * 100) / 100;
        req.copay_percent = Math.min(99, Math.max(1, Math.round((req.copay_amount / Math.max(1, req.price)) * 100)));
      }
      req.approval_ref = approvalRef;
    } else if (decision === 'reject') {
      if (!body?.reason?.trim()) throw new BadRequestException('rejection reason is required');
      this.push(req, 'REJECTED', user.id, body.reason.trim());
      req.rejection_reason = body.reason.trim();
    } else {
      throw new BadRequestException('decision must be approve_full | approve_partial | reject');
    }
    req.decided_by = user.id; req.decided_at = new Date();
    await req.save();
    this.events.emit('insurance.decided', { request_id: req.id, patient_id: req.patient_id, provider_id: req.provider_id, state: req.state, copay_amount: req.copay_amount });
    // Step 6 of the flow (19.11): when the insurer covers everything nothing is owed, so the service continues now.
    if (req.state === 'APPROVED_FULL') await this.confirmServiceBooking(req);
    return req.toObject();
  }

  /** Patient accepts full self-pay on a rejected/partial request: copay becomes
   * the full price so the standard intent → verify → COPAY_PAID flow applies. */
  async acceptSelfPay(user: any, id: string) {
    const req = await this.requests.findOne({ id: { $eq: id } });
    if (!req) throw new NotFoundException('request not found');
    if (req.patient_id !== user.id) throw new ForbiddenException();
    if (!['REJECTED', 'APPROVED_PARTIAL'].includes(req.state)) throw new BadRequestException(`self-pay not available in state ${req.state}`);
    const price = Number(req.price) || 0;
    if (price <= 0) throw new BadRequestException('invalid request price');
    this.push(req, 'COPAY_PENDING', user.id, 'patient accepted full self-pay');
    req.copay_percent = 100; req.copay_amount = Math.round(price * 100) / 100;
    await req.save();
    return req.toObject();
  }

  /** Payment capabilities for an insurance request (methods the gateway supports). */
  async capabilities(user: any, id: string, mode: 'copay' | 'self-pay' = 'copay') {
    const req = await this.requests.findOne({ id: { $eq: id } });
    if (!req) throw new NotFoundException('request not found');
    if (req.patient_id !== user.id && user.role !== 'admin') throw new ForbiddenException();
    const methods = [{ id: 'card', kind: 'online' }, { id: 'apple-pay', kind: 'online' }, { id: 'google-pay', kind: 'online' }];
    return {
      booking_id: req.booking_id,
      amount: mode === 'copay' ? Number(req.copay_amount || 0) : Number(req.total_amount || req.price || 0),
      currency: 'SAR',
      purpose: mode === 'copay' ? 'insurance_copay' : 'insurance_self_pay',
      methods,
    };
  }

  /** Project COPAY_PAID onto the underlying service booking so each service
   * confirms without its own listener. Best-effort; never fails payment. */
  private async confirmServiceBooking(req: any) {
    try {
      const { model } = this.bookingModel(req.booking_kind || '');
      const now = new Date();
      if (req.booking_kind === 'consultation') {
        await model.updateOne({ id: { $eq: req.booking_id } }, {
          $set: { status: 'CONFIRMED' },
          $push: { state_history: { state: 'CONFIRMED', at: now, by_user_id: 'system', by_role: 'system', note: 'copay paid' } },
        });
      } else if (req.booking_kind === 'lab') {
        // LJ-03: a paid lab insurance booking must reach CONFIRMED, not stay pending.
        await model.updateOne(
          { id: { $eq: req.booking_id }, state: { $in: ['NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY'] } },
          { $set: { state: 'CONFIRMED', insurance_status: 'approved' }, $push: { state_history: { from: 'WAITING_COPAY', to: 'CONFIRMED', by_user_id: 'system', by_role: 'system', at: now, note: 'copay paid' } } },
        );
      } else if (req.booking_kind === 'radiology') {
        await model.updateOne(
          { id: { $eq: req.booking_id }, state: { $in: ['NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY'] } },
          { $set: { state: 'CONFIRMED', insurance_status: 'approved' } },
        );
      } else if (req.booking_kind === 'nursing') {
        await model.updateOne({ id: { $eq: req.booking_id } }, { $set: { insurance_status: 'approved' } });
      }
    } catch { /* payment already recorded; projection retries on next event */ }
  }

  /** Patient pays only the copay (BR-2.5→2.6). Service starts only after this. */
  async payCopay(user: any, id: string, body: any) {
    const req = await this.requests.findOne({ id: { $eq: id } });
    if (!req) throw new NotFoundException('request not found');
    if (req.patient_id !== user.id) throw new ForbiddenException();
    const coveredInFull = req.state === 'APPROVED_FULL';
    if (coveredInFull) {
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
    this.events.emit('insurance.copay.paid', { request_id: req.id, provider_id: req.provider_id, patient_id: req.patient_id, covered_in_full: coveredInFull });
    await this.confirmServiceBooking(req);
    return req.toObject();
  }

  /**
   * Settle ONE copay from a verified paid transaction. The patient, the booking
   * and the amount must all line up; anything else is refused so a mismatched
   * payment can never be applied to a request.
   *
   * Returns the settled state, or null when the request is not in a settleable
   * state (already settled, cancelled, or not awaiting a copay).
   */
  private async settleOne(req: any, paymentId: string): Promise<string | null> {
    if (!req || req.state !== 'COPAY_PENDING') return null;
    const payment: any = await this.transactions.findOne({
      id: paymentId,
      patient_id: req.patient_id,
      booking_kind: 'insurance',
      booking_id: req.id,
      status: 'paid',
    }).lean();
    if (!payment || Number(payment.amount) !== Number(req.copay_amount)) return null;
    req.payment_id = payment.id;
    req.copay_paid_at = new Date();
    this.push(req, 'COPAY_PAID', 'system', `verified payment ${payment.id}`);
    await req.save();
    this.events.emit('insurance.copay.paid', { request_id: req.id, provider_id: req.provider_id, patient_id: req.patient_id });
    await this.confirmServiceBooking(req);
    return req.state;
  }

  /** The payment event is the normal post-checkout settlement path; it cannot be faked by a client body. */
  @OnEvent('payment.completed')
  async settleVerifiedCopay(event: any) {
    if (event?.booking_kind !== 'insurance' || !event?.transaction_id) return;
    const req = await this.requests.findOne({ id: { $eq: event.booking_id }, patient_id: { $eq: event.patient_id }, state: 'COPAY_PENDING' });
    if (!req) return;
    await this.settleOne(req, event.transaction_id).catch(() => null);
  }

  /**
   * Reconciliation sweep for copays the event listener missed.
   *
   * `settleVerifiedCopay` is an in-process, best-effort handler: if the listener
   * chain aborts, the process restarts between the gateway capture and the
   * handler, or the write races the decide() that created the request, the copay
   * is collected but the request stays COPAY_PENDING forever and the service
   * never starts. That is a money-taken / service-not-delivered state, so it must
   * not depend on a single best-effort delivery.
   *
   * This is the standard "reconcile paid-but-unsettled" job: find requests that
   * are still awaiting a copay, look for an authoritative paid transaction with a
   * matching amount, and settle through the exact same guarded path. Safe to run
   * repeatedly — settling a request that is already COPAY_PAID is a no-op.
   */
  // Every 15s, not every minute: the patient is waiting on the result, and a
  // 60s safety net means a failed event delivery holds the service for a full
  // minute. The sweep is cheap (one indexed find + at most 100 guarded writes).
  @Cron('*/15 * * * * *')
  async reconcileCopays() {
    try {
      const stale = await this.requests.find({ state: 'COPAY_PENDING', payment_id: { $in: [null, undefined] } })
        .sort({ decided_at: 1 }).limit(100).lean();
      if (!stale.length) return;
      let settled = 0;
      for (const row of stale) {
        const payment: any = await this.transactions.findOne({
          booking_kind: 'insurance',
          booking_id: row.id,
          status: 'paid',
        }).sort({ paid_at: -1 }).lean();
        if (!payment || Number(payment.amount) !== Number(row.copay_amount)) continue;
        // Re-read as a document: the guard re-checks state so a concurrent
        // settlement cannot double-apply.
        const fresh = await this.requests.findOne({ id: { $eq: row.id }, state: 'COPAY_PENDING' });
        if (!fresh) continue;
        const state = await this.settleOne(fresh, payment.id).catch(() => null);
        if (state === 'COPAY_PAID') settled++;
      }
      if (settled) this.logger.warn(`insurance copay reconciliation settled ${settled} request(s)`);
    } catch (e: any) {
      this.logger.warn(`insurance copay reconciliation failed: ${e.message}`);
    }
  }

  async cancel(user: any, id: string) {
    const req = await this.requests.findOne({ id: { $eq: id } });
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
  // GET /insurance/companies is answered by InsuranceController (insurance.module.ts): the public catalogue with the plan
  // tiers (issue 1550). A second handler here shadowed it, asked for a session and dropped the plans.
  @SelfService()
  @Post('save-policy') savePolicy(@CurrentUser() u: any, @Body() b: SavePolicyDto) { return this.svc.savePolicy(u, b); }
  @Get('my-policy') myPolicy(@CurrentUser() u: any) { return this.svc.myPolicy(u); }

  // #829/#845/#837: renamed body, same route (the clients call `coverage-check`). The answer is
  // the saved policy only and says so with `live_check` and `note_code`.
  @Get('coverage-check') async coverageCheck(@CurrentUser() u: any, @Query() q: any) {
    return this.svc.coverageCheckAnswer(u, q);
  }

  // #836: rows carry a translatable key instead of one hard-coded Arabic sentence.
  @Get('benefits-summary') async benefits(@CurrentUser() u: any) {
    return this.svc.benefitsAnswer(u);
  }

  @SelfService()
  @Post('requests') createRequest(@CurrentUser() u: any, @Body() b: CreateRequestDto) { return this.svc.createRequest(u, b); }
  @Get('requests/my') myRequests(@CurrentUser() u: any) { return this.svc.myRequests(u); }
  @Get('requests/:id') one(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.getOne(id, u); }
  @SelfService()
  @Post('requests/:id/pay-copay') payCopay(@CurrentUser() u: any, @Param('id') id: string, @Body() b: PayCopayDto) { return this.svc.payCopay(u, id, b); }
  @SelfService()
  @Post('requests/:id/accept-self-pay') acceptSelfPay(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.acceptSelfPay(u, id); }
  @Get('requests/:id/capabilities') capabilities(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.capabilities(u, id, 'copay'); }
  @Get('requests/:id/self-pay-capabilities') selfPayCapabilities(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.capabilities(u, id, 'self-pay'); }
  @SelfService()
  @Post('requests/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancel(u, id); }
  @SelfService()
  @Post('requests/:id/resubmit') resubmit(@CurrentUser() u: any, @Param('id') id: string, @Body() b: ResubmitDto) { return this.svc.resubmit(u, id, b); }
  @SelfService()
  @Post('requests/:id/appeal') appeal(@CurrentUser() u: any, @Param('id') id: string, @Body() b: AppealDto) { return this.svc.appeal(u, id, b); }

  // ---- provider ----
  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('requests/provider/queue') providerQueue(@CurrentUser() u: any, @Query('state') state?: string) { return this.svc.providerQueue(u, state); }
  @Roles(UserRole.DOCTOR, UserRole.PHARMACY, UserRole.LAB, UserRole.RADIOLOGY, UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE, UserRole.HOSPITAL, UserRole.DELIVERY, UserRole.ADMIN)
  @Post('requests/:id/decide') decide(@CurrentUser() u: any, @Param('id') id: string, @Body() b: DecideDto) { return this.svc.decide(u, id, b); }
  @Roles(UserRole.DOCTOR, UserRole.PHARMACY, UserRole.LAB, UserRole.RADIOLOGY, UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE, UserRole.HOSPITAL, UserRole.DELIVERY, UserRole.ADMIN)
  @Post('provider/jobs/consultation/:id/insurance') gatekeeper(@CurrentUser() u: any, @Param('id') id: string, @Body() b: GatekeeperDto) { return this.svc.gatekeeperDecision(u, id, b); }

  // ---- legacy aliases the patient app already calls ----
  @SelfService()
  @Post('payment-confirm') paymentConfirm(@CurrentUser() u: any, @Body() b: PaymentConfirmDto) {
    return this.svc.payCopay(u, b?.request_id || b?.id, b);
  }

  // LJ-02: `/insurance/claims/my` used to return insurance *requests* from here,
  // a second store the claim screens read. Claims live in the insurance module
  // behind `GET /insurance/claims`; this duplicate route is removed.
}

// Patient-app aliases: POST /patient/pay-copay, POST /home-care/insurance/verify
@Controller()
@UseGuards(JwtAuthGuard)
export class InsuranceAliasController {
  constructor(private readonly svc: InsuranceFlowService) {}

  @SelfService()
  @Post('patient/pay-copay') payCopay(@CurrentUser() u: any, @Body() b: PayCopayDto2) {
    return this.svc.payCopay(u, b?.request_id || b?.id, b);
  }

  @Roles(UserRole.DOCTOR, UserRole.PHARMACY, UserRole.LAB, UserRole.RADIOLOGY, UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE, UserRole.HOSPITAL, UserRole.DELIVERY, UserRole.ADMIN)
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
    @Optional() @InjectConnection() private readonly conn?: Connection,
    @Optional() private readonly refundExec?: RefundExecutor,
  ) {}

  policyFor(scheduledAt?: Date) {
    if (!scheduledAt) return REFUND_WINDOWS[0];
    const diffMs = new Date(scheduledAt).getTime() - Date.now();
    const hours = (diffMs + 1000) / 3600000;
    for (const w of REFUND_WINDOWS) if (hours >= w.hours_before) return w;
    return REFUND_WINDOWS[REFUND_WINDOWS.length - 1];
  }

  async request(user: any, body: any) {
    if (!body?.booking_id) throw new BadRequestException('booking_id is required');
    const paid = Number(body?.amount_paid || 0);
    if (paid <= 0) throw new BadRequestException('amount_paid must be positive');
    if (!body?.reason || typeof body.reason !== 'string' || !body.reason.trim()) throw new BadRequestException('reason is required');
    const dup = await this.refunds.findOne({ booking_id: { $eq: body.booking_id }, state: { $ne: 'REJECTED' } });
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

  /** LJ-05: one refund read model — pending requests plus every refund
   * executed by RefundExecutor (card or cash) with its status. */
  async myRefunds(user: any) {
    const [requests, executed] = await Promise.all([
      this.refunds.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean(),
      this.conn
        ? this.conn.collection('platformledgerentries').find(
            { type: 'refund', 'meta.patient_id': user.id },
            { projection: { _id: 0 } },
          ).sort({ createdAt: -1 }).limit(50).toArray()
        : Promise.resolve([]),
    ]);
    const executedIds = new Set(executed.map((row: any) => String(row.ref_id)));
    const pending = requests.filter((row: any) => !executedIds.has(String(row.id)));
    const ledgerRefunds = executed.map((row: any) => ({
      id: row.ref_id,
      booking_id: row.order_id,
      booking_kind: row.meta?.booking_kind,
      state: 'EXECUTED',
      refund_amount: row.amount,
      reason: row.description,
      method: row.meta?.method,
      createdAt: row.createdAt,
    }));
    return [...pending, ...ledgerRefunds]
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 50);
  }

  adminQueue() {
    return this.refunds.find({ state: { $in: ['REQUESTED', 'FAILED'] } }, { _id: 0, __v: 0 }).sort({ createdAt: 1 }).limit(100).lean();
  }

  async decide(user: any, id: string, approve: boolean, note?: string) {
    const r = await this.refunds.findOne({ id: { $eq: id } });
    if (!r) throw new NotFoundException('refund not found');
    // FAILED can be approved again: the executor is idempotent per refund id, so a retry never pays twice.
    const retry = approve && r.state === 'FAILED';
    if (r.state !== 'REQUESTED' && !retry) throw new BadRequestException(`already ${r.state}`);
    r.state = approve ? 'APPROVED' : 'REJECTED';
    r.history.push({ state: r.state, at: new Date(), by: user.id, note: retry ? `retry: ${note || ''}`.trim() : note });
    await r.save();

    // Approval moves the money (B-4). Success is EXECUTED; a gateway/ledger error is FAILED (shown to
    // the admin, approvable again), never a silent "approved" with no refund behind it.
    if (approve && this.refundExec) {
      try {
        const exec = await this.refundExec.execute({
          refund_id: r.id,
          booking_kind: r.booking_kind,
          booking_id: r.booking_id,
          patient_id: r.patient_id,
          amount: r.refund_amount,
          reason: `admin_refund_approved: ${note || 'no_reason'}`.slice(0, 180),
          actor_id: user.id,
        });
        r.state = 'EXECUTED';
        r.executed_at = new Date();
        r.history.push({ state: 'EXECUTED', at: r.executed_at, by: user.id, note: exec?.gateway_refund_id ? `gateway ${exec.gateway_refund_id}` : exec?.method });
      } catch (err: any) {
        r.state = 'FAILED';
        r.history.push({ state: 'FAILED', at: new Date(), by: user.id, note: String(err?.message || 'execution_failed').slice(0, 200) });
      }
      await r.save();
    }

    return r.toObject();
  }
}

@Controller('refunds')
@SelfService()
@UseGuards(JwtAuthGuard)
export class RefundController {
  constructor(private readonly svc: RefundService) {}
  @Post('request') request(@CurrentUser() u: any, @Body() b: RequestDto) { return this.svc.request(u, b); }
  @Get('my') my(@CurrentUser() u: any) { return this.svc.myRefunds(u); }
  @Get('policy-preview') preview(@Query('scheduled_at') s?: string) {
    const w = this.svc.policyFor(s ? new Date(s) : undefined);
    return { refund_percent: w.percent, note_ar: w.note_ar, windows: REFUND_WINDOWS };
  }
}

@Controller('admin/finance')
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard)
export class AdminFinanceCoreController {
  constructor(
    private readonly refunds: RefundService,
    private readonly finance: FinanceCoreService,
  ) {}
  // Platform money totals and the refund queue are finance reads: they name finance.read like the other finance pages.
  @RequirePermissions(Permission.FINANCE_READ)
  @Get('ledger/summary') summary() { return this.finance.platformSummary(); }
  @RequirePermissions(Permission.FINANCE_READ)
  @Get('refunds/queue') refundsQueue() { return this.refunds.adminQueue(); }
  @StepUp()
  @RequirePermissions(Permission.ORDER_REFUND)
  @Post('refunds/:id/decide') decideRefund(@CurrentUser() u: any, @Param('id') id: string, @Body() b: DecideRefundDto) {
    return this.refunds.decide(u, id, b?.approve === true, b?.note);
  }
}

// Admin reads of every patient's insurance requests: admin role and order.read (the insurance-queue page permission).
// Before this the class had no @Roles, so any signed-in patient or provider who reached /admin passed JwtAuthGuard.
@Controller('admin/insurance')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
@RequirePermissions(Permission.ORDER_READ)
export class AdminInsuranceController {
  constructor(private readonly svc: InsuranceFlowService) {}
  @Get('requests') all(@Query('state') state?: string) { return this.svc.adminAll(state); }
  @Get('stats') stats() { return this.svc.adminStats(); }
}

@Controller('finance')
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard)
export class FinanceCoreController {
  constructor(private readonly finance: FinanceCoreService) {}
  /** Internal hook: record commission when an order/booking is paid. */
  @RequirePermissions(Permission.FINANCE_CONFIG_EDIT)
  @Post('ledger/accrue') accrue(@Body() b: AccrueDto) { return this.finance.accrue(b); }
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
      { name: 'ProviderProfile', schema: ProviderProfileSchema },
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
})export class InsuranceEngineModule {}
