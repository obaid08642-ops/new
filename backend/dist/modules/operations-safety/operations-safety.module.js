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
exports.OperationsSafetyModule = exports.OperationsSafetyController = exports.OperationsSafetyService = exports.CancellationPenaltySchema = exports.CancellationPenalty = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const mongoose_3 = require("@nestjs/mongoose");
const mongoose_4 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const order_schema_1 = require("../../schemas/order.schema");
const lab_schema_1 = require("../../schemas/lab.schema");
const radiology_schema_1 = require("../../schemas/radiology.schema");
const home_care_schema_1 = require("../../schemas/home-care.schema");
const appointment_schema_1 = require("../../schemas/appointment.schema");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
const workflow_engine_module_1 = require("../workflow-engine/workflow-engine.module");
let CancellationPenalty = class CancellationPenalty extends mongoose_4.Document {
};
exports.CancellationPenalty = CancellationPenalty;
__decorate([
    (0, mongoose_3.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], CancellationPenalty.prototype, "booking_id", void 0);
__decorate([
    (0, mongoose_3.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], CancellationPenalty.prototype, "kind", void 0);
__decorate([
    (0, mongoose_3.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], CancellationPenalty.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_3.Prop)(),
    __metadata("design:type", String)
], CancellationPenalty.prototype, "provider_id", void 0);
__decorate([
    (0, mongoose_3.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], CancellationPenalty.prototype, "amount", void 0);
__decorate([
    (0, mongoose_3.Prop)(),
    __metadata("design:type", String)
], CancellationPenalty.prototype, "reason", void 0);
__decorate([
    (0, mongoose_3.Prop)({ default: 'assessed', enum: ['assessed', 'waived', 'collected'] }),
    __metadata("design:type", String)
], CancellationPenalty.prototype, "status", void 0);
exports.CancellationPenalty = CancellationPenalty = __decorate([
    (0, mongoose_3.Schema)({ collection: 'cancellation_penalties', timestamps: true })
], CancellationPenalty);
exports.CancellationPenaltySchema = mongoose_3.SchemaFactory.createForClass(CancellationPenalty);
const SLA = {
    pharmacy: { REQUESTED: 5, MATCHING: 15, ASSIGNED: 10, CONFIRMED: 30, IN_PROGRESS: 90 },
    lab: { REQUESTED: 60, MATCHING: 30, ASSIGNED: 60, CONFIRMED: 360, IN_PROGRESS: 1440 },
    radiology: { REQUESTED: 60, MATCHING: 30, ASSIGNED: 60, CONFIRMED: 360, IN_PROGRESS: 1440 },
    nursing: { REQUESTED: 10, MATCHING: 20, ASSIGNED: 30, CONFIRMED: 120, IN_PROGRESS: 240 },
    consultation: { REQUESTED: 5, MATCHING: 5, ASSIGNED: 10, CONFIRMED: 60, IN_PROGRESS: 60 },
};
let OperationsSafetyService = class OperationsSafetyService {
    constructor(orders, labs, rads, home, appts, providers, penalties, engine) {
        this.orders = orders;
        this.labs = labs;
        this.rads = rads;
        this.home = home;
        this.appts = appts;
        this.providers = providers;
        this.penalties = penalties;
        this.engine = engine;
    }
    async slaReport() {
        const now = Date.now();
        const isOverdue = (kind, universal, updatedAt) => {
            const sla = SLA[kind]?.[universal];
            if (!sla)
                return null;
            const elapsedMin = (now - new Date(updatedAt).getTime()) / 60000;
            return elapsedMin > sla ? Math.round(elapsedMin - sla) : null;
        };
        const collect = async (model, kind, stateField = 'state') => {
            const docs = await model.find({ [stateField]: { $exists: true } }, { id: 1, [stateField]: 1, updatedAt: 1, createdAt: 1, patient_id: 1, _id: 0 }).sort({ updatedAt: -1 }).limit(500).lean();
            return docs.map(d => {
                const u = (0, workflow_engine_module_1.toUniversal)(kind, d[stateField]);
                const overdueBy = isOverdue(kind, u, d.updatedAt || d.createdAt);
                return overdueBy != null ? { kind, id: d.id, universal_state: u, overdue_minutes: overdueBy, patient_id: d.patient_id } : null;
            }).filter(Boolean);
        };
        const out = (await Promise.all([
            collect(this.orders, 'pharmacy'),
            collect(this.labs, 'lab'),
            collect(this.rads, 'radiology'),
            collect(this.home, 'nursing'),
            collect(this.appts, 'consultation', 'status'),
        ])).flat();
        return { sla_definition: SLA, breached: out, total_breached: out.length };
    }
    async escalate(body = {}) {
        const cutoff = new Date(Date.now() - (body.threshold_minutes || 15) * 60000);
        const results = [];
        if (!body.kind || body.kind === 'pharmacy') {
            const stuck = await this.orders.find({ state: { $regex: /BROADCAST|MATCHING|READY_FOR_SPLIT/ }, updatedAt: { $lte: cutoff } }).limit(20);
            for (const o of stuck) {
                results.push({ kind: 'pharmacy', id: o.id, action: 're-broadcast-requested', current_state: o.state });
            }
        }
        if (!body.kind || body.kind === 'nursing') {
            const stuck = await this.home.find({ state: { $regex: /BROADCAST/ }, updatedAt: { $lte: cutoff } }).limit(20);
            for (const o of stuck) {
                results.push({ kind: 'nursing', id: o.id, action: 're-broadcast-requested', current_state: o.state });
            }
        }
        return { escalated: results.length, results };
    }
    async assessPenalty(args) {
        if (!args.scheduled_at)
            return null;
        const minutesBefore = (new Date(args.scheduled_at).getTime() - new Date(args.cancelled_at || new Date()).getTime()) / 60000;
        let amount = 0;
        let reason = 'no_penalty';
        if (minutesBefore < 60 && minutesBefore >= 0) {
            amount = 30;
            reason = 'cancel_within_1h';
        }
        else if (minutesBefore < 0) {
            amount = 50;
            reason = 'cancel_after_scheduled';
        }
        if (amount === 0)
            return null;
        return this.penalties.create({
            booking_id: args.booking_id, kind: args.kind, patient_id: args.patient_id,
            provider_id: args.provider_id, amount, reason, status: 'assessed',
        });
    }
    async fallback(body) {
        const ranked = await this.engine.rankProviders({
            kind: body.kind, city: body.city, insurance: body.insurance,
            service_keys: body.service_keys, max_results: 10,
        });
        const filtered = body.exclude_provider_id
            ? ranked.filter((r) => r.user_id !== body.exclude_provider_id && r.id !== body.exclude_provider_id)
            : ranked;
        return { fallback_count: filtered.length, providers: filtered.slice(0, 5) };
    }
    async listPenalties(filter = {}) {
        const q = {};
        if (filter.status)
            q.status = filter.status;
        if (filter.patient_id)
            q.patient_id = filter.patient_id;
        return this.penalties.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean();
    }
};
exports.OperationsSafetyService = OperationsSafetyService;
exports.OperationsSafetyService = OperationsSafetyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Order')),
    __param(1, (0, mongoose_1.InjectModel)('LabBooking')),
    __param(2, (0, mongoose_1.InjectModel)('RadiologyBooking')),
    __param(3, (0, mongoose_1.InjectModel)('HomeCareBooking')),
    __param(4, (0, mongoose_1.InjectModel)(appointment_schema_1.Appointment.name)),
    __param(5, (0, mongoose_1.InjectModel)('ProviderProfile')),
    __param(6, (0, mongoose_1.InjectModel)('CancellationPenalty')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        workflow_engine_module_1.WorkflowEngineService])
], OperationsSafetyService);
let OperationsSafetyController = class OperationsSafetyController {
    constructor(svc) {
        this.svc = svc;
    }
    sla() { return this.svc.slaReport(); }
    escalate(b) { return this.svc.escalate(b); }
    assess(b) { return this.svc.assessPenalty(b); }
    fallback(b) { return this.svc.fallback(b); }
    penalties(q) { return this.svc.listPenalties(q); }
};
exports.OperationsSafetyController = OperationsSafetyController;
__decorate([
    (0, common_1.Get)('sla'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OperationsSafetyController.prototype, "sla", null);
__decorate([
    (0, common_1.Post)('escalate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OperationsSafetyController.prototype, "escalate", null);
__decorate([
    (0, common_1.Post)('penalty/assess'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OperationsSafetyController.prototype, "assess", null);
__decorate([
    (0, common_1.Post)('fallback'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OperationsSafetyController.prototype, "fallback", null);
__decorate([
    (0, common_1.Get)('penalties'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OperationsSafetyController.prototype, "penalties", null);
exports.OperationsSafetyController = OperationsSafetyController = __decorate([
    (0, common_1.Controller)('ops'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [OperationsSafetyService])
], OperationsSafetyController);
let OperationsSafetyModule = class OperationsSafetyModule {
};
exports.OperationsSafetyModule = OperationsSafetyModule;
exports.OperationsSafetyModule = OperationsSafetyModule = __decorate([
    (0, common_1.Module)({
        imports: [
            workflow_engine_module_1.WorkflowEngineModule,
            mongoose_1.MongooseModule.forFeature([
                { name: 'Order', schema: order_schema_1.OrderSchema },
                { name: 'LabBooking', schema: lab_schema_1.LabBookingSchema },
                { name: 'RadiologyBooking', schema: radiology_schema_1.RadiologyBookingSchema },
                { name: 'HomeCareBooking', schema: home_care_schema_1.HomeCareBookingSchema },
                { name: appointment_schema_1.Appointment.name, schema: appointment_schema_1.AppointmentSchema },
                { name: 'ProviderProfile', schema: provider_profile_schema_1.ProviderProfileSchema },
                { name: 'CancellationPenalty', schema: exports.CancellationPenaltySchema },
            ]),
        ],
        controllers: [OperationsSafetyController],
        providers: [OperationsSafetyService],
        exports: [OperationsSafetyService],
    })
], OperationsSafetyModule);
//# sourceMappingURL=operations-safety.module.js.map