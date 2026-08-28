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
exports.ConsistencyModule = exports.ConsistencyController = exports.ConsistencyService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const order_schema_1 = require("../../schemas/order.schema");
const lab_schema_1 = require("../../schemas/lab.schema");
const radiology_schema_1 = require("../../schemas/radiology.schema");
const home_care_schema_1 = require("../../schemas/home-care.schema");
const appointment_schema_1 = require("../../schemas/appointment.schema");
const system_event_schema_1 = require("../events/system-event.schema");
const user_schema_1 = require("../../schemas/user.schema");
const workflow_engine_module_1 = require("../workflow-engine/workflow-engine.module");
let ConsistencyService = class ConsistencyService {
    constructor(orders, labs, rads, home, appts, events, users, engine) {
        this.orders = orders;
        this.labs = labs;
        this.rads = rads;
        this.home = home;
        this.appts = appts;
        this.events = events;
        this.users = users;
        this.engine = engine;
    }
    async audit() {
        const since = new Date(Date.now() - 30 * 86400000);
        const audit = { since, issues: { duplicates: [], orphans: [], mismatched: [], missing_birth_event: [], stuck: [] } };
        const dupPipeline = (model, providerField, stateField = 'state') => [
            { $match: { createdAt: { $gte: since }, [stateField]: { $nin: ['CANCELLED'] } } },
            { $group: { _id: { patient_id: '$patient_id', provider: `$${providerField}`, day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } }, ids: { $push: '$id' }, count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } },
            { $limit: 30 },
        ];
        const [dupOrders, dupLabs, dupRads, dupHome, dupAppts] = await Promise.all([
            this.orders.aggregate(dupPipeline(this.orders, 'pharmacy_id')),
            this.labs.aggregate(dupPipeline(this.labs, 'provider_account_id')),
            this.rads.aggregate(dupPipeline(this.rads, 'provider_account_id')),
            this.home.aggregate(dupPipeline(this.home, 'provider_account_id')),
            this.appts.aggregate(dupPipeline(this.appts, 'doctor_user_id', 'status')),
        ]);
        audit.issues.duplicates = [
            ...dupOrders.map(d => ({ kind: 'pharmacy', ...d })),
            ...dupLabs.map(d => ({ kind: 'lab', ...d })),
            ...dupRads.map(d => ({ kind: 'radiology', ...d })),
            ...dupHome.map(d => ({ kind: 'nursing', ...d })),
            ...dupAppts.map(d => ({ kind: 'consultation', ...d })),
        ];
        const sample = async (model, label, ownerField = 'patient_id') => {
            const docs = await model.find({ createdAt: { $gte: since } }, { id: 1, [ownerField]: 1, _id: 0 }).limit(500).lean();
            const ids = Array.from(new Set(docs.map(d => d[ownerField]).filter(Boolean)));
            const existing = await this.users.find({ id: { $in: ids } }, { id: 1, _id: 0 }).lean();
            const have = new Set(existing.map((u) => u.id));
            return docs.filter(d => d[ownerField] && !have.has(d[ownerField])).map(d => ({ kind: label, id: d.id, missing_owner: d[ownerField] }));
        };
        audit.issues.orphans = [
            ...await sample(this.orders, 'pharmacy'),
            ...await sample(this.labs, 'lab'),
            ...await sample(this.rads, 'radiology'),
            ...await sample(this.home, 'nursing'),
            ...await sample(this.appts, 'consultation'),
        ].slice(0, 50);
        const mismatchFor = async (model, kind, stateField = 'state') => {
            const cancelled = await model.find({ [stateField]: { $regex: /CANCELLED/i }, createdAt: { $gte: since } }, { id: 1, [stateField]: 1, _id: 0 }).limit(200).lean();
            const ids = cancelled.map((c) => c.id);
            const eventTypeMap = { pharmacy: 'order', lab: 'lab_booking', radiology: 'radiology_booking', nursing: 'nursing_booking', consultation: 'appointment' };
            const events = await this.events.find({ entity_type: eventTypeMap[kind], entity_id: { $in: ids }, type: 'service.cancelled' }, { entity_id: 1, _id: 0 }).lean();
            const haveEvt = new Set(events.map((e) => e.entity_id));
            return cancelled.filter((c) => !haveEvt.has(c.id)).map((c) => ({ kind, id: c.id, state: c[stateField], missing_event: 'service.cancelled' }));
        };
        audit.issues.mismatched = [
            ...await mismatchFor(this.orders, 'pharmacy'),
            ...await mismatchFor(this.labs, 'lab'),
            ...await mismatchFor(this.rads, 'radiology'),
            ...await mismatchFor(this.home, 'nursing'),
            ...await mismatchFor(this.appts, 'consultation', 'status'),
        ].slice(0, 50);
        const missingBirthFor = async (model, kind) => {
            const recent = await model.find({ createdAt: { $gte: since } }, { id: 1, _id: 0 }).limit(500).lean();
            const ids = recent.map(r => r.id);
            const eventTypeMap = { pharmacy: 'order', lab: 'lab_booking', radiology: 'radiology_booking', nursing: 'nursing_booking', consultation: 'appointment' };
            const events = await this.events.find({ entity_type: eventTypeMap[kind], entity_id: { $in: ids }, type: 'service.requested' }, { entity_id: 1, _id: 0 }).lean();
            const have = new Set(events.map((e) => e.entity_id));
            return recent.filter(r => !have.has(r.id)).map(r => ({ kind, id: r.id }));
        };
        audit.issues.missing_birth_event = [
            ...await missingBirthFor(this.orders, 'pharmacy'),
            ...await missingBirthFor(this.labs, 'lab'),
            ...await missingBirthFor(this.rads, 'radiology'),
            ...await missingBirthFor(this.home, 'nursing'),
            ...await missingBirthFor(this.appts, 'consultation'),
        ].slice(0, 50);
        const cutoff = new Date(Date.now() - 30 * 60000);
        const [stuckO, stuckH] = await Promise.all([
            this.orders.find({ state: { $regex: /BROADCAST|MATCHING|READY_FOR_SPLIT/ }, createdAt: { $lte: cutoff } }, { id: 1, state: 1, createdAt: 1, _id: 0 }).limit(50).lean(),
            this.home.find({ state: { $regex: /BROADCAST/ }, createdAt: { $lte: cutoff } }, { id: 1, state: 1, createdAt: 1, _id: 0 }).limit(50).lean(),
        ]);
        audit.issues.stuck = [
            ...stuckO.map((o) => ({ kind: 'pharmacy', ...o })),
            ...stuckH.map((o) => ({ kind: 'nursing', ...o })),
        ];
        audit.totals = Object.fromEntries(Object.entries(audit.issues).map(([k, v]) => [k, v.length]));
        return audit;
    }
    async reconcile() {
        const auditResult = await this.audit();
        let fixed = 0;
        for (const m of auditResult.issues.missing_birth_event) {
            try {
                await this.engine.announceCreated({ kind: m.kind, entity_id: m.id, actor_role: 'system', meta: { reconciled: true } });
                fixed++;
            }
            catch { }
        }
        return { reconciled_birth_events: fixed, total_missing: auditResult.issues.missing_birth_event.length };
    }
    async fixOrphans(dryRun = true) {
        const auditResult = await this.audit();
        const results = [];
        for (const o of auditResult.issues.orphans) {
            if (dryRun) {
                results.push({ ...o, action: 'would_cancel' });
                continue;
            }
            try {
                const Model = o.kind === 'pharmacy' ? this.orders
                    : o.kind === 'lab' ? this.labs
                        : o.kind === 'radiology' ? this.rads
                            : o.kind === 'nursing' ? this.home
                                : this.appts;
                const field = o.kind === 'consultation' ? 'status' : 'state';
                await Model.updateOne({ id: o.id }, { $set: { [field]: 'CANCELLED' }, $push: { state_history: { from: 'orphan', to: 'CANCELLED', by_role: 'system', at: new Date(), note: 'orphan_owner_missing' } } });
                results.push({ ...o, action: 'cancelled' });
            }
            catch (e) {
                results.push({ ...o, action: 'failed', error: String(e?.message || e) });
            }
        }
        return { dry_run: dryRun, processed: results.length, results };
    }
};
exports.ConsistencyService = ConsistencyService;
exports.ConsistencyService = ConsistencyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Order')),
    __param(1, (0, mongoose_1.InjectModel)('LabBooking')),
    __param(2, (0, mongoose_1.InjectModel)('RadiologyBooking')),
    __param(3, (0, mongoose_1.InjectModel)('HomeCareBooking')),
    __param(4, (0, mongoose_1.InjectModel)(appointment_schema_1.Appointment.name)),
    __param(5, (0, mongoose_1.InjectModel)('SystemEvent')),
    __param(6, (0, mongoose_1.InjectModel)('User')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        workflow_engine_module_1.WorkflowEngineService])
], ConsistencyService);
let ConsistencyController = class ConsistencyController {
    constructor(svc) {
        this.svc = svc;
    }
    audit() { return this.svc.audit(); }
    reconcile() { return this.svc.reconcile(); }
    fixOrphans(dry) { return this.svc.fixOrphans(dry !== 'false'); }
};
exports.ConsistencyController = ConsistencyController;
__decorate([
    (0, common_1.Get)('audit'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ConsistencyController.prototype, "audit", null);
__decorate([
    (0, common_1.Post)('reconcile'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ConsistencyController.prototype, "reconcile", null);
__decorate([
    (0, common_1.Post)('fix-orphans'),
    __param(0, (0, common_1.Query)('dry_run')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConsistencyController.prototype, "fixOrphans", null);
exports.ConsistencyController = ConsistencyController = __decorate([
    (0, common_1.Controller)('consistency'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [ConsistencyService])
], ConsistencyController);
let ConsistencyModule = class ConsistencyModule {
};
exports.ConsistencyModule = ConsistencyModule;
exports.ConsistencyModule = ConsistencyModule = __decorate([
    (0, common_1.Module)({
        imports: [
            workflow_engine_module_1.WorkflowEngineModule,
            mongoose_1.MongooseModule.forFeature([
                { name: 'Order', schema: order_schema_1.OrderSchema },
                { name: 'LabBooking', schema: lab_schema_1.LabBookingSchema },
                { name: 'RadiologyBooking', schema: radiology_schema_1.RadiologyBookingSchema },
                { name: 'HomeCareBooking', schema: home_care_schema_1.HomeCareBookingSchema },
                { name: appointment_schema_1.Appointment.name, schema: appointment_schema_1.AppointmentSchema },
                { name: 'SystemEvent', schema: system_event_schema_1.SystemEventSchema },
                { name: 'User', schema: user_schema_1.UserSchema },
            ]),
        ],
        controllers: [ConsistencyController],
        providers: [ConsistencyService],
        exports: [ConsistencyService],
    })
], ConsistencyModule);
//# sourceMappingURL=consistency.module.js.map