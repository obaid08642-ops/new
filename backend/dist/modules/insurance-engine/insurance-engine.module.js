"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsuranceEngineModule = exports.FinanceCoreController = exports.AdminInsuranceController = exports.AdminFinanceCoreController = exports.RefundController = exports.RefundService = exports.InsuranceAliasController = exports.InsuranceFlowController = exports.InsuranceFlowService = exports.QuoteController = exports.FinanceCoreService = exports.CommissionRuleSchema = exports.CommissionRule = exports.PlatformLedgerEntrySchema = exports.PlatformLedgerEntry = exports.RefundRequestSchema = exports.RefundRequest = exports.InsuranceServiceRequestSchema = exports.InsuranceServiceRequest = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("@nestjs/mongoose");
const mongoose_3 = require("mongoose");
const uuid_1 = require("uuid");
const event_emitter_1 = require("@nestjs/event-emitter");
const auth_guard_1 = require("../../common/auth.guard");
const insurance_schema_1 = require("../../schemas/insurance.schema");
const patient_profile_schema_1 = require("../../schemas/patient-profile.schema");
const finance_engine_module_1 = require("../finance-engine/finance-engine.module");
const transaction_schema_1 = require("../../schemas/transaction.schema");
const order_schema_1 = require("../../schemas/order.schema");
const lab_schema_1 = require("../../schemas/lab.schema");
const radiology_schema_1 = require("../../schemas/radiology.schema");
const home_care_schema_1 = require("../../schemas/home-care.schema");
const appointment_schema_1 = require("../../schemas/appointment.schema");
let InsuranceServiceRequest = class InsuranceServiceRequest {
};
exports.InsuranceServiceRequest = InsuranceServiceRequest;
__decorate([
    (0, mongoose_2.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], InsuranceServiceRequest.prototype, "id", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], InsuranceServiceRequest.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", String)
], InsuranceServiceRequest.prototype, "patient_name", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], InsuranceServiceRequest.prototype, "provider_id", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", String)
], InsuranceServiceRequest.prototype, "booking_id", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", String)
], InsuranceServiceRequest.prototype, "booking_kind", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", String)
], InsuranceServiceRequest.prototype, "service_type", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", String)
], InsuranceServiceRequest.prototype, "channel", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true }),
    __metadata("design:type", Number)
], InsuranceServiceRequest.prototype, "price", void 0);
__decorate([
    (0, mongoose_2.Prop)({ type: Object, required: true }),
    __metadata("design:type", Object)
], InsuranceServiceRequest.prototype, "policy", void 0);
__decorate([
    (0, mongoose_2.Prop)({
        default: 'PENDING_PROVIDER_REVIEW', index: true,
        enum: ['PENDING_PROVIDER_REVIEW', 'APPROVED_FULL', 'APPROVED_PARTIAL', 'REJECTED', 'COPAY_PENDING', 'COPAY_PAID', 'EXPIRED', 'CANCELLED', 'APPEAL_PENDING'],
    }),
    __metadata("design:type", String)
], InsuranceServiceRequest.prototype, "state", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", Number)
], InsuranceServiceRequest.prototype, "copay_percent", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", Number)
], InsuranceServiceRequest.prototype, "copay_amount", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", String)
], InsuranceServiceRequest.prototype, "rejection_reason", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", String)
], InsuranceServiceRequest.prototype, "decided_by", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", Date)
], InsuranceServiceRequest.prototype, "decided_at", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", String)
], InsuranceServiceRequest.prototype, "payment_id", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", Date)
], InsuranceServiceRequest.prototype, "copay_paid_at", void 0);
__decorate([
    (0, mongoose_2.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], InsuranceServiceRequest.prototype, "history", void 0);
__decorate([
    (0, mongoose_2.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], InsuranceServiceRequest.prototype, "documents", void 0);
__decorate([
    (0, mongoose_2.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], InsuranceServiceRequest.prototype, "resubmission_count", void 0);
__decorate([
    (0, mongoose_2.Prop)({ type: Object }),
    __metadata("design:type", Object)
], InsuranceServiceRequest.prototype, "appeal", void 0);
exports.InsuranceServiceRequest = InsuranceServiceRequest = __decorate([
    (0, mongoose_2.Schema)({ timestamps: true })
], InsuranceServiceRequest);
exports.InsuranceServiceRequestSchema = mongoose_2.SchemaFactory.createForClass(InsuranceServiceRequest);
let RefundRequest = class RefundRequest {
};
exports.RefundRequest = RefundRequest;
__decorate([
    (0, mongoose_2.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], RefundRequest.prototype, "id", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "booking_id", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", String)
], RefundRequest.prototype, "booking_kind", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true }),
    __metadata("design:type", Number)
], RefundRequest.prototype, "amount_paid", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true }),
    __metadata("design:type", Number)
], RefundRequest.prototype, "refund_percent", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true }),
    __metadata("design:type", Number)
], RefundRequest.prototype, "refund_amount", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", String)
], RefundRequest.prototype, "policy_note_ar", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", String)
], RefundRequest.prototype, "reason", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", String)
], RefundRequest.prototype, "moyasar_payment_id", void 0);
__decorate([
    (0, mongoose_2.Prop)({ default: 'REQUESTED', index: true, enum: ['REQUESTED', 'APPROVED', 'EXECUTED', 'REJECTED', 'FAILED'] }),
    __metadata("design:type", String)
], RefundRequest.prototype, "state", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", Date)
], RefundRequest.prototype, "executed_at", void 0);
__decorate([
    (0, mongoose_2.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], RefundRequest.prototype, "history", void 0);
exports.RefundRequest = RefundRequest = __decorate([
    (0, mongoose_2.Schema)({ timestamps: true })
], RefundRequest);
exports.RefundRequestSchema = mongoose_2.SchemaFactory.createForClass(RefundRequest);
let PlatformLedgerEntry = class PlatformLedgerEntry {
};
exports.PlatformLedgerEntry = PlatformLedgerEntry;
__decorate([
    (0, mongoose_2.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], PlatformLedgerEntry.prototype, "id", void 0);
__decorate([
    (0, mongoose_2.Prop)({ index: true }),
    __metadata("design:type", String)
], PlatformLedgerEntry.prototype, "order_id", void 0);
__decorate([
    (0, mongoose_2.Prop)({ index: true }),
    __metadata("design:type", String)
], PlatformLedgerEntry.prototype, "booking_id", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PlatformLedgerEntry.prototype, "provider_id", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true }),
    __metadata("design:type", String)
], PlatformLedgerEntry.prototype, "service_type", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true }),
    __metadata("design:type", Number)
], PlatformLedgerEntry.prototype, "gross_amount", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true }),
    __metadata("design:type", Number)
], PlatformLedgerEntry.prototype, "commission_rate", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true }),
    __metadata("design:type", Number)
], PlatformLedgerEntry.prototype, "commission_amount", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true }),
    __metadata("design:type", Number)
], PlatformLedgerEntry.prototype, "net_provider_amount", void 0);
__decorate([
    (0, mongoose_2.Prop)({ default: 'online' }),
    __metadata("design:type", String)
], PlatformLedgerEntry.prototype, "payment_method", void 0);
__decorate([
    (0, mongoose_2.Prop)({ default: 'ACCRUED', index: true, enum: ['ACCRUED', 'SETTLED', 'VOID'] }),
    __metadata("design:type", String)
], PlatformLedgerEntry.prototype, "state", void 0);
exports.PlatformLedgerEntry = PlatformLedgerEntry = __decorate([
    (0, mongoose_2.Schema)({ timestamps: true })
], PlatformLedgerEntry);
exports.PlatformLedgerEntrySchema = mongoose_2.SchemaFactory.createForClass(PlatformLedgerEntry);
let CommissionRule = class CommissionRule {
};
exports.CommissionRule = CommissionRule;
__decorate([
    (0, mongoose_2.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], CommissionRule.prototype, "service_type", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true }),
    __metadata("design:type", Number)
], CommissionRule.prototype, "rate", void 0);
__decorate([
    (0, mongoose_2.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], CommissionRule.prototype, "active", void 0);
exports.CommissionRule = CommissionRule = __decorate([
    (0, mongoose_2.Schema)({ timestamps: true })
], CommissionRule);
exports.CommissionRuleSchema = mongoose_2.SchemaFactory.createForClass(CommissionRule);
const DEFAULT_COMMISSIONS = {
    consultation: 0.15, video: 0.15, audio: 0.15, chat: 0.15,
    clinic: 0.12, home_visit: 0.18, nursing: 0.18, physiotherapy: 0.18,
    pharmacy: 0.10, lab: 0.12, radiology: 0.12, ambulance: 0.15, default: 0.15,
};
let FinanceCoreService = class FinanceCoreService {
    constructor(ledger, rules) {
        this.ledger = ledger;
        this.rules = rules;
    }
    async rateFor(serviceType) {
        const rule = await this.rules.findOne({ service_type: serviceType, active: true }).lean();
        return rule?.rate ?? DEFAULT_COMMISSIONS[serviceType] ?? DEFAULT_COMMISSIONS.default;
    }
    async accrue(input) {
        if (!input.provider_id || !input.amount)
            throw new common_1.BadRequestException('provider_id and amount required');
        const dupKey = input.order_id || input.booking_id;
        const existing = await this.ledger.findOne({ $or: [{ order_id: dupKey }, { booking_id: dupKey }] });
        if (existing)
            return existing.toObject();
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
    async providerSummary(providerId) {
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
};
exports.FinanceCoreService = FinanceCoreService;
exports.FinanceCoreService = FinanceCoreService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('PlatformLedgerEntry')),
    __param(1, (0, mongoose_1.InjectModel)('CommissionRule')),
    __metadata("design:paramtypes", [mongoose_3.Model,
        mongoose_3.Model])
], FinanceCoreService);
const ONLINE_ONLY_CHANNELS = ['online', 'video', 'audio', 'chat', 'home', 'home_visit', 'delivery', 'nursing', 'physiotherapy', 'ambulance'];
let QuoteController = class QuoteController {
    quote(q) {
        const channel = (q?.channel || 'clinic').toLowerCase();
        const price = Number(q?.price || 0);
        const withInsurance = q?.with_insurance === 'true' || q?.with_insurance === '1';
        const onlineOnly = ONLINE_ONLY_CHANNELS.includes(channel);
        const allowed_methods = [];
        if (withInsurance)
            allowed_methods.push('insurance');
        allowed_methods.push('online');
        if (!onlineOnly)
            allowed_methods.push('clinic_pay');
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
};
exports.QuoteController = QuoteController;
__decorate([
    (0, common_1.Get)('quote'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QuoteController.prototype, "quote", null);
exports.QuoteController = QuoteController = __decorate([
    (0, common_1.Controller)('bookings'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard)
], QuoteController);
let InsuranceFlowService = class InsuranceFlowService {
    constructor(requests, companies, patients, events, transactions, orders, labs, radiology, homeCare, appointments) {
        this.requests = requests;
        this.companies = companies;
        this.patients = patients;
        this.events = events;
        this.transactions = transactions;
        this.orders = orders;
        this.labs = labs;
        this.radiology = radiology;
        this.homeCare = homeCare;
        this.appointments = appointments;
    }
    push(req, state, by, note) {
        req.state = state;
        req.history = [...(req.history || []), { state, at: new Date(), by, note }];
    }
    async companiesList() {
        return this.companies.find({ is_active: true }, { _id: 0, __v: 0 }).lean();
    }
    async savePolicy(user, body) {
        if (!body?.company_id)
            throw new common_1.BadRequestException('company_id is required');
        const company = await this.companies.findOne({ id: body.company_id }).lean();
        if (!company)
            throw new common_1.NotFoundException('insurance company not found');
        const policy = {
            company_id: body.company_id,
            company_name: company.name_ar || company.name,
            plan_class: body.plan_class,
            member_id: body.member_id,
            policy_number: body.policy_number,
            card_image_url: body.card_image_url,
            saved_at: new Date(),
        };
        await this.patients.updateOne({ user_id: user.id }, { $set: { insurance: policy } }, { upsert: true });
        return { ok: true, policy };
    }
    async myPolicy(user) {
        const p = await this.patients.findOne({ user_id: user.id }, { _id: 0, insurance: 1 }).lean();
        const ins = p?.insurance || null;
        return { has_policy: !!(ins && (ins.company_id || ins.provider || ins.policy_number)), policy: ins };
    }
    bookingModel(kind) {
        const value = String(kind || '').trim().toLowerCase();
        if (['pharmacy', 'order', 'orders'].includes(value))
            return { kind: 'pharmacy', model: this.orders };
        if (['lab', 'labs'].includes(value))
            return { kind: 'lab', model: this.labs };
        if (['radiology', 'rads'].includes(value))
            return { kind: 'radiology', model: this.radiology };
        if (['nursing', 'home_care', 'home-care', 'homecare'].includes(value))
            return { kind: 'nursing', model: this.homeCare };
        if (['consultation', 'appointment', 'appt'].includes(value))
            return { kind: 'consultation', model: this.appointments };
        throw new common_1.BadRequestException('invalid_booking_kind');
    }
    async createRequest(user, body) {
        const bookingId = String(body?.booking_id || '').trim();
        if (!bookingId)
            throw new common_1.BadRequestException('booking_id_required');
        const { kind, model } = this.bookingModel(body?.booking_kind);
        const booking = await model.findOne({ id: bookingId, patient_id: user.id }).lean();
        if (!booking)
            throw new common_1.NotFoundException('owned_booking_not_found');
        const providerId = booking.provider_id || booking.doctor_user_id || booking.pharmacy_id || booking.facility_id;
        if (!providerId)
            throw new common_1.BadRequestException('booking_provider_assignment_required');
        const price = Number(booking.total ?? booking.total_price ?? booking.price ?? 0);
        if (!Number.isFinite(price) || price <= 0)
            throw new common_1.BadRequestException('booking_price_not_ready');
        const { has_policy, policy } = await this.myPolicy(user);
        if (!has_policy)
            throw new common_1.BadRequestException('NO_INSURANCE_POLICY');
        const existing = await this.requests.findOne({ patient_id: user.id, booking_kind: kind, booking_id: bookingId, state: { $in: ['PENDING_PROVIDER_REVIEW', 'COPAY_PENDING', 'APPROVED_FULL', 'COPAY_PAID'] } }).lean();
        if (existing)
            return existing;
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
    async resubmit(user, id, body) {
        const req = await this.requests.findOne({ id });
        if (!req)
            throw new common_1.NotFoundException('request not found');
        if (req.patient_id !== user.id)
            throw new common_1.ForbiddenException();
        if (!['REJECTED', 'CANCELLED'].includes(req.state)) {
            throw new common_1.BadRequestException(`cannot resubmit in state ${req.state}`);
        }
        const resubmission_count = (req.resubmission_count || 0) + 1;
        if (resubmission_count > 3)
            throw new common_1.BadRequestException('max_resubmissions_reached (3)');
        req.resubmission_count = resubmission_count;
        if (body?.documents)
            req.documents = [...(req.documents || []), ...body.documents];
        req.rejection_reason = null;
        this.push(req, 'PENDING_PROVIDER_REVIEW', user.id, `resubmission #${resubmission_count}${body?.note ? ': ' + body.note : ''}`);
        await req.save();
        this.events.emit('insurance.resubmitted', { request_id: req.id, patient_id: req.patient_id, provider_id: req.provider_id, count: resubmission_count });
        return req.toObject();
    }
    async appeal(user, id, body) {
        const req = await this.requests.findOne({ id });
        if (!req)
            throw new common_1.NotFoundException('request not found');
        if (req.patient_id !== user.id)
            throw new common_1.ForbiddenException();
        if (req.state !== 'REJECTED')
            throw new common_1.BadRequestException(`cannot appeal in state ${req.state}`);
        if (!body?.reason?.trim())
            throw new common_1.BadRequestException('appeal reason is required');
        if (req.appeal)
            throw new common_1.BadRequestException('appeal already filed for this request');
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
    async myRequests(user) {
        return this.requests.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean();
    }
    async providerQueue(user, state) {
        const filter = { provider_id: user.id };
        if (state)
            filter.state = state;
        else
            filter.state = { $in: ['PENDING_PROVIDER_REVIEW', 'COPAY_PENDING', 'COPAY_PAID'] };
        return this.requests.find(filter, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean();
    }
    adminAll(state) {
        const filter = state ? { state } : {};
        return this.requests.find(filter, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200).lean();
    }
    async adminStats() {
        const rows = await this.requests.aggregate([
            { $group: { _id: '$state', count: { $sum: 1 }, total_price: { $sum: '$price' }, total_copay: { $sum: { $ifNull: ['$copay_amount', 0] } } } },
        ]);
        const by_state = {};
        for (const r of rows)
            by_state[r._id] = { count: r.count, total_price: r.total_price, total_copay: r.total_copay };
        return { by_state, total: rows.reduce((s, r) => s + r.count, 0) };
    }
    async getOne(id, user) {
        const req = await this.requests.findOne({ id }, { _id: 0, __v: 0 }).lean();
        if (!req)
            throw new common_1.NotFoundException('request not found');
        if (req.patient_id !== user.id && req.provider_id !== user.id && user.role !== 'admin')
            throw new common_1.ForbiddenException();
        return req;
    }
    async decide(user, id, body) {
        const req = await this.requests.findOne({ id });
        if (!req)
            throw new common_1.NotFoundException('request not found');
        if (req.provider_id !== user.id && user.role !== 'admin')
            throw new common_1.ForbiddenException();
        if (req.state !== 'PENDING_PROVIDER_REVIEW')
            throw new common_1.BadRequestException(`request already decided (${req.state})`);
        const decision = body?.decision;
        if (decision === 'approve_full') {
            this.push(req, 'APPROVED_FULL', user.id);
            req.copay_percent = 0;
            req.copay_amount = 0;
        }
        else if (decision === 'approve_partial') {
            const pct = Number(body?.copay_percent);
            if (!pct || pct <= 0 || pct >= 100)
                throw new common_1.BadRequestException('copay_percent must be between 1 and 99');
            this.push(req, 'COPAY_PENDING', user.id, `patient copay ${pct}%`);
            req.copay_percent = pct;
            req.copay_amount = Math.round(req.price * (pct / 100) * 100) / 100;
        }
        else if (decision === 'reject') {
            if (!body?.reason?.trim())
                throw new common_1.BadRequestException('rejection reason is required');
            this.push(req, 'REJECTED', user.id, body.reason.trim());
            req.rejection_reason = body.reason.trim();
        }
        else {
            throw new common_1.BadRequestException('decision must be approve_full | approve_partial | reject');
        }
        req.decided_by = user.id;
        req.decided_at = new Date();
        await req.save();
        this.events.emit('insurance.decided', { request_id: req.id, patient_id: req.patient_id, state: req.state, copay_amount: req.copay_amount });
        return req.toObject();
    }
    async payCopay(user, id, body) {
        const req = await this.requests.findOne({ id });
        if (!req)
            throw new common_1.NotFoundException('request not found');
        if (req.patient_id !== user.id)
            throw new common_1.ForbiddenException();
        if (req.state === 'APPROVED_FULL') {
            this.push(req, 'COPAY_PAID', user.id, 'no copay due');
        }
        else if (req.state === 'COPAY_PENDING') {
            const paymentId = String(body?.payment_id || '').trim();
            if (!paymentId)
                throw new common_1.BadRequestException('verified_payment_id_required');
            const payment = await this.transactions.findOne({
                id: paymentId,
                patient_id: req.patient_id,
                booking_kind: 'insurance',
                booking_id: req.id,
                status: 'paid',
            }).lean();
            if (!payment || Number(payment.amount) !== Number(req.copay_amount))
                throw new common_1.BadRequestException('verified_copay_payment_required');
            req.payment_id = payment.id;
            this.push(req, 'COPAY_PAID', user.id, `verified payment ${payment.id}`);
            req.copay_paid_at = new Date();
        }
        else {
            throw new common_1.BadRequestException(`cannot pay copay in state ${req.state}`);
        }
        await req.save();
        this.events.emit('insurance.copay.paid', { request_id: req.id, provider_id: req.provider_id, patient_id: req.patient_id });
        return req.toObject();
    }
    async settleVerifiedCopay(event) {
        if (event?.booking_kind !== 'insurance' || !event?.transaction_id)
            return;
        const req = await this.requests.findOne({ id: event.booking_id, patient_id: event.patient_id, state: 'COPAY_PENDING' });
        if (!req)
            return;
        const payment = await this.transactions.findOne({
            id: event.transaction_id,
            patient_id: req.patient_id,
            booking_kind: 'insurance',
            booking_id: req.id,
            status: 'paid',
        }).lean();
        if (!payment || Number(payment.amount) !== Number(req.copay_amount))
            return;
        req.payment_id = payment.id;
        req.copay_paid_at = new Date();
        this.push(req, 'COPAY_PAID', 'system', `verified payment ${payment.id}`);
        await req.save();
        this.events.emit('insurance.copay.paid', { request_id: req.id, provider_id: req.provider_id, patient_id: req.patient_id });
    }
    async cancel(user, id) {
        const req = await this.requests.findOne({ id });
        if (!req)
            throw new common_1.NotFoundException('request not found');
        if (req.patient_id !== user.id)
            throw new common_1.ForbiddenException();
        if (['COPAY_PAID'].includes(req.state))
            throw new common_1.BadRequestException('cannot cancel after payment');
        this.push(req, 'CANCELLED', user.id);
        await req.save();
        return { ok: true };
    }
};
exports.InsuranceFlowService = InsuranceFlowService;
__decorate([
    (0, event_emitter_1.OnEvent)('payment.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InsuranceFlowService.prototype, "settleVerifiedCopay", null);
exports.InsuranceFlowService = InsuranceFlowService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('InsuranceServiceRequest')),
    __param(1, (0, mongoose_1.InjectModel)('InsuranceCompany')),
    __param(2, (0, mongoose_1.InjectModel)('PatientProfile')),
    __param(4, (0, mongoose_1.InjectModel)('Transaction')),
    __param(5, (0, mongoose_1.InjectModel)('Order')),
    __param(6, (0, mongoose_1.InjectModel)('LabBooking')),
    __param(7, (0, mongoose_1.InjectModel)('RadiologyBooking')),
    __param(8, (0, mongoose_1.InjectModel)('HomeCareBooking')),
    __param(9, (0, mongoose_1.InjectModel)(appointment_schema_1.Appointment.name)),
    __metadata("design:paramtypes", [mongoose_3.Model,
        mongoose_3.Model,
        mongoose_3.Model,
        event_emitter_1.EventEmitter2,
        mongoose_3.Model,
        mongoose_3.Model,
        mongoose_3.Model,
        mongoose_3.Model,
        mongoose_3.Model,
        mongoose_3.Model])
], InsuranceFlowService);
let InsuranceFlowController = class InsuranceFlowController {
    constructor(svc) {
        this.svc = svc;
    }
    companies() { return this.svc.companiesList(); }
    savePolicy(u, b) { return this.svc.savePolicy(u, b); }
    myPolicy(u) { return this.svc.myPolicy(u); }
    async coverageCheck(u, q) {
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
    async benefits(u) {
        const { has_policy, policy } = await this.svc.myPolicy(u);
        return { has_policy, policy, benefits: has_policy ? [{ key: 'manual_review', note_ar: 'تخضع الموافقة لمراجعة مزود الخدمة لوثيقتك' }] : [] };
    }
    createRequest(u, b) { return this.svc.createRequest(u, b); }
    myRequests(u) { return this.svc.myRequests(u); }
    one(u, id) { return this.svc.getOne(id, u); }
    payCopay(u, id, b) { return this.svc.payCopay(u, id, b); }
    cancel(u, id) { return this.svc.cancel(u, id); }
    resubmit(u, id, b) { return this.svc.resubmit(u, id, b); }
    appeal(u, id, b) { return this.svc.appeal(u, id, b); }
    providerQueue(u, state) { return this.svc.providerQueue(u, state); }
    decide(u, id, b) { return this.svc.decide(u, id, b); }
    paymentConfirm(u, b) {
        return this.svc.payCopay(u, b?.request_id || b?.id, b);
    }
    claimsMy(u) { return this.svc.myRequests(u); }
};
exports.InsuranceFlowController = InsuranceFlowController;
__decorate([
    (0, common_1.Get)('companies'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InsuranceFlowController.prototype, "companies", null);
__decorate([
    (0, common_1.Post)('save-policy'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], InsuranceFlowController.prototype, "savePolicy", null);
__decorate([
    (0, common_1.Get)('my-policy'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InsuranceFlowController.prototype, "myPolicy", null);
__decorate([
    (0, common_1.Get)('coverage-check'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], InsuranceFlowController.prototype, "coverageCheck", null);
__decorate([
    (0, common_1.Get)('benefits-summary'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InsuranceFlowController.prototype, "benefits", null);
__decorate([
    (0, common_1.Post)('requests'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], InsuranceFlowController.prototype, "createRequest", null);
__decorate([
    (0, common_1.Get)('requests/my'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InsuranceFlowController.prototype, "myRequests", null);
__decorate([
    (0, common_1.Get)('requests/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], InsuranceFlowController.prototype, "one", null);
__decorate([
    (0, common_1.Post)('requests/:id/pay-copay'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], InsuranceFlowController.prototype, "payCopay", null);
__decorate([
    (0, common_1.Post)('requests/:id/cancel'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], InsuranceFlowController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)('requests/:id/resubmit'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], InsuranceFlowController.prototype, "resubmit", null);
__decorate([
    (0, common_1.Post)('requests/:id/appeal'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], InsuranceFlowController.prototype, "appeal", null);
__decorate([
    (0, common_1.Get)('requests/provider/queue'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('state')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], InsuranceFlowController.prototype, "providerQueue", null);
__decorate([
    (0, common_1.Post)('requests/:id/decide'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], InsuranceFlowController.prototype, "decide", null);
__decorate([
    (0, common_1.Post)('payment-confirm'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], InsuranceFlowController.prototype, "paymentConfirm", null);
__decorate([
    (0, common_1.Get)('claims/my'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InsuranceFlowController.prototype, "claimsMy", null);
exports.InsuranceFlowController = InsuranceFlowController = __decorate([
    (0, common_1.Controller)('insurance'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [InsuranceFlowService])
], InsuranceFlowController);
let InsuranceAliasController = class InsuranceAliasController {
    constructor(svc) {
        this.svc = svc;
    }
    payCopay(u, b) {
        return this.svc.payCopay(u, b?.request_id || b?.id, b);
    }
    verify(u) {
        return this.svc.myPolicy(u);
    }
};
exports.InsuranceAliasController = InsuranceAliasController;
__decorate([
    (0, common_1.Post)('patient/pay-copay'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], InsuranceAliasController.prototype, "payCopay", null);
__decorate([
    (0, common_1.Post)('home-care/insurance/verify'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InsuranceAliasController.prototype, "verify", null);
exports.InsuranceAliasController = InsuranceAliasController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [InsuranceFlowService])
], InsuranceAliasController);
const REFUND_WINDOWS = [
    { hours_before: 24, percent: 100, note_ar: 'إلغاء قبل أكثر من 24 ساعة — استرداد كامل' },
    { hours_before: 4, percent: 50, note_ar: 'إلغاء قبل 4–24 ساعة — استرداد 50%' },
    { hours_before: 0, percent: 0, note_ar: 'إلغاء قبل أقل من 4 ساعات أو عدم الحضور — لا استرداد' },
];
let RefundService = class RefundService {
    constructor(refunds, events, fraud) {
        this.refunds = refunds;
        this.events = events;
        this.fraud = fraud;
    }
    policyFor(scheduledAt) {
        if (!scheduledAt)
            return REFUND_WINDOWS[0];
        const hours = (new Date(scheduledAt).getTime() - Date.now()) / 3600000;
        for (const w of REFUND_WINDOWS)
            if (hours >= w.hours_before)
                return w;
        return REFUND_WINDOWS[REFUND_WINDOWS.length - 1];
    }
    async request(user, body) {
        if (!body?.booking_id)
            throw new common_1.BadRequestException('booking_id is required');
        const paid = Number(body?.amount_paid || 0);
        if (paid <= 0)
            throw new common_1.BadRequestException('amount_paid must be positive');
        if (!body?.reason || typeof body.reason !== 'string' || !body.reason.trim())
            throw new common_1.BadRequestException('reason is required');
        const dup = await this.refunds.findOne({ booking_id: body.booking_id, state: { $ne: 'REJECTED' } });
        if (dup)
            return dup.toObject();
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
    myRefunds(user) {
        return this.refunds.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean();
    }
    adminQueue() {
        return this.refunds.find({ state: 'REQUESTED' }, { _id: 0, __v: 0 }).sort({ createdAt: 1 }).limit(100).lean();
    }
    async decide(user, id, approve, note) {
        const r = await this.refunds.findOne({ id });
        if (!r)
            throw new common_1.NotFoundException('refund not found');
        if (r.state !== 'REQUESTED')
            throw new common_1.BadRequestException(`already ${r.state}`);
        r.state = approve ? 'APPROVED' : 'REJECTED';
        r.history.push({ state: r.state, at: new Date(), by: user.id, note });
        await r.save();
        return r.toObject();
    }
};
exports.RefundService = RefundService;
exports.RefundService = RefundService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('RefundRequest')),
    __metadata("design:paramtypes", [mongoose_3.Model,
        event_emitter_1.EventEmitter2,
        finance_engine_module_1.FraudService])
], RefundService);
let RefundController = class RefundController {
    constructor(svc) {
        this.svc = svc;
    }
    request(u, b) { return this.svc.request(u, b); }
    my(u) { return this.svc.myRefunds(u); }
    preview(s) {
        const w = this.svc.policyFor(s ? new Date(s) : undefined);
        return { refund_percent: w.percent, note_ar: w.note_ar, windows: REFUND_WINDOWS };
    }
};
exports.RefundController = RefundController;
__decorate([
    (0, common_1.Post)('request'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], RefundController.prototype, "request", null);
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RefundController.prototype, "my", null);
__decorate([
    (0, common_1.Get)('policy-preview'),
    __param(0, (0, common_1.Query)('scheduled_at')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RefundController.prototype, "preview", null);
exports.RefundController = RefundController = __decorate([
    (0, common_1.Controller)('refunds'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [RefundService])
], RefundController);
let AdminFinanceCoreController = class AdminFinanceCoreController {
    constructor(refunds, finance) {
        this.refunds = refunds;
        this.finance = finance;
    }
    summary() { return this.finance.platformSummary(); }
    refundsQueue() { return this.refunds.adminQueue(); }
    decideRefund(u, id, b) {
        return this.refunds.decide(u, id, b?.approve === true, b?.note);
    }
};
exports.AdminFinanceCoreController = AdminFinanceCoreController;
__decorate([
    (0, common_1.Get)('ledger/summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminFinanceCoreController.prototype, "summary", null);
__decorate([
    (0, common_1.Get)('refunds/queue'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminFinanceCoreController.prototype, "refundsQueue", null);
__decorate([
    (0, common_1.Post)('refunds/:id/decide'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminFinanceCoreController.prototype, "decideRefund", null);
exports.AdminFinanceCoreController = AdminFinanceCoreController = __decorate([
    (0, common_1.Controller)('admin/finance'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [RefundService,
        FinanceCoreService])
], AdminFinanceCoreController);
let AdminInsuranceController = class AdminInsuranceController {
    constructor(svc) {
        this.svc = svc;
    }
    all(state) { return this.svc.adminAll(state); }
    stats() { return this.svc.adminStats(); }
};
exports.AdminInsuranceController = AdminInsuranceController;
__decorate([
    (0, common_1.Get)('requests'),
    __param(0, (0, common_1.Query)('state')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminInsuranceController.prototype, "all", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminInsuranceController.prototype, "stats", null);
exports.AdminInsuranceController = AdminInsuranceController = __decorate([
    (0, common_1.Controller)('admin/insurance'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [InsuranceFlowService])
], AdminInsuranceController);
let FinanceCoreController = class FinanceCoreController {
    constructor(finance) {
        this.finance = finance;
    }
    accrue(b) { return this.finance.accrue(b); }
    providerSummary(u) { return this.finance.providerSummary(u.id); }
};
exports.FinanceCoreController = FinanceCoreController;
__decorate([
    (0, common_1.Post)('ledger/accrue'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FinanceCoreController.prototype, "accrue", null);
__decorate([
    (0, common_1.Get)('ledger/provider/summary'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FinanceCoreController.prototype, "providerSummary", null);
exports.FinanceCoreController = FinanceCoreController = __decorate([
    (0, common_1.Controller)('finance'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [FinanceCoreService])
], FinanceCoreController);
let InsuranceEngineModule = class InsuranceEngineModule {
};
exports.InsuranceEngineModule = InsuranceEngineModule;
exports.InsuranceEngineModule = InsuranceEngineModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'InsuranceServiceRequest', schema: exports.InsuranceServiceRequestSchema },
                { name: 'RefundRequest', schema: exports.RefundRequestSchema },
                { name: 'PlatformLedgerEntry', schema: exports.PlatformLedgerEntrySchema },
                { name: 'CommissionRule', schema: exports.CommissionRuleSchema },
                { name: 'InsuranceCompany', schema: insurance_schema_1.InsuranceCompanySchema },
                { name: 'PatientProfile', schema: patient_profile_schema_1.PatientProfileSchema },
                { name: 'Transaction', schema: transaction_schema_1.TransactionSchema },
                { name: 'Order', schema: order_schema_1.OrderSchema },
                { name: 'LabBooking', schema: lab_schema_1.LabBookingSchema },
                { name: 'RadiologyBooking', schema: radiology_schema_1.RadiologyBookingSchema },
                { name: 'HomeCareBooking', schema: home_care_schema_1.HomeCareBookingSchema },
                { name: appointment_schema_1.Appointment.name, schema: appointment_schema_1.AppointmentSchema },
            ]),
        ],
        controllers: [
            QuoteController, InsuranceFlowController, InsuranceAliasController,
            RefundController, AdminFinanceCoreController, FinanceCoreController, AdminInsuranceController,
        ],
        providers: [InsuranceFlowService, FinanceCoreService, RefundService],
        exports: [InsuranceFlowService, FinanceCoreService, RefundService],
    })
], InsuranceEngineModule);
//# sourceMappingURL=insurance-engine.module.js.map