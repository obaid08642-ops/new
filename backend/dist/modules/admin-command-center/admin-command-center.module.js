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
exports.AdminCommandCenterModule = exports.AdminCommandCenterController = exports.AdminCommandCenterService = void 0;
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
const user_schema_1 = require("../../schemas/user.schema");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
const system_event_schema_1 = require("../events/system-event.schema");
const workflow_engine_module_1 = require("../workflow-engine/workflow-engine.module");
const admin_governance_module_1 = require("../admin-governance/admin-governance.module");
let AdminCommandCenterService = class AdminCommandCenterService {
    constructor(orders, labs, rads, home, appts, users, providers, events, gov) {
        this.orders = orders;
        this.labs = labs;
        this.rads = rads;
        this.home = home;
        this.appts = appts;
        this.users = users;
        this.providers = providers;
        this.events = events;
        this.gov = gov;
    }
    async liveBookings() {
        const activeUniversals = [enums_1.ServiceState.REQUESTED, enums_1.ServiceState.MATCHING, enums_1.ServiceState.ASSIGNED, enums_1.ServiceState.CONFIRMED, enums_1.ServiceState.IN_PROGRESS];
        const liveOf = (kind) => activeUniversals.flatMap(u => (0, workflow_engine_module_1.domainStatesFor)(kind, u));
        const since = new Date(Date.now() - 7 * 86400000);
        const [pharm, labs, rads, home, appts] = await Promise.all([
            this.orders.find({ state: { $in: liveOf('pharmacy') }, createdAt: { $gte: since } }, { id: 1, state: 1, patient_id: 1, pharmacy_id: 1, total: 1, createdAt: 1, tracking_id: 1, _id: 0 }).sort({ createdAt: -1 }).limit(40).lean(),
            this.labs.find({ state: { $in: liveOf('lab') }, createdAt: { $gte: since } }, { id: 1, state: 1, patient_id: 1, account_id: 1, total: 1, createdAt: 1, tracking_id: 1, _id: 0 }).sort({ createdAt: -1 }).limit(40).lean(),
            this.rads.find({ state: { $in: liveOf('radiology') }, createdAt: { $gte: since } }, { id: 1, state: 1, patient_id: 1, account_id: 1, total: 1, createdAt: 1, tracking_id: 1, _id: 0 }).sort({ createdAt: -1 }).limit(40).lean(),
            this.home.find({ state: { $in: liveOf('nursing') }, createdAt: { $gte: since } }, { id: 1, state: 1, patient_id: 1, account_id: 1, total: 1, createdAt: 1, tracking_id: 1, _id: 0 }).sort({ createdAt: -1 }).limit(40).lean(),
            this.appts.find({ status: { $in: liveOf('consultation') }, createdAt: { $gte: since } }, { id: 1, status: 1, patient_id: 1, doctor_user_id: 1, price: 1, createdAt: 1, tracking_id: 1, _id: 0 }).sort({ createdAt: -1 }).limit(40).lean(),
        ]);
        const norm = (kind, x, stateField = 'state') => ({
            kind, id: x.id, tracking_id: x.tracking_id || x.id, universal_state: (0, workflow_engine_module_1.toUniversal)(kind, x[stateField]),
            domain_state: x[stateField], patient_id: x.patient_id, provider_id: x.pharmacy_id || x.provider_account_id || x.doctor_user_id || null,
            total: x.total || x.price || 0, createdAt: x.createdAt,
        });
        return [
            ...pharm.map(o => norm('pharmacy', o)),
            ...labs.map(l => norm('lab', l)),
            ...rads.map(r => norm('radiology', r)),
            ...home.map(h => norm('nursing', h)),
            ...appts.map((a) => norm('consultation', a, 'status')),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 100);
    }
    async failedTransactions() {
        const since = new Date(Date.now() - 7 * 86400000);
        return this.events.find({ type: 'service.rollback', createdAt: { $gte: since } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean();
    }
    async stuckMatching() {
        const cutoff = new Date(Date.now() - 15 * 60000);
        const stuckOf = (kind) => (0, workflow_engine_module_1.domainStatesFor)(kind, enums_1.ServiceState.MATCHING);
        const [pharm, home] = await Promise.all([
            this.orders.find({ state: { $in: stuckOf('pharmacy') }, createdAt: { $lte: cutoff } }, { id: 1, tracking_id: 1, createdAt: 1, _id: 0 }).limit(30).lean(),
            this.home.find({ state: { $in: stuckOf('nursing') }, createdAt: { $lte: cutoff } }, { id: 1, tracking_id: 1, createdAt: 1, _id: 0 }).limit(30).lean(),
        ]);
        return { pharmacy: pharm, nursing: home };
    }
    async providersLiveStatus() {
        return this.providers.aggregate([
            { $group: { _id: { type: '$type', status: '$status' }, count: { $sum: 1 } } },
            { $project: { _id: 0, type: '$_id.type', status: '$_id.status', count: 1 } },
        ]);
    }
    async orderDetail(kind, id) {
        const models = {
            pharmacy: { m: this.orders, providerKey: 'pharmacy_id', stateField: 'state' },
            lab: { m: this.labs, providerKey: 'provider_account_id', stateField: 'state' },
            radiology: { m: this.rads, providerKey: 'provider_account_id', stateField: 'state' },
            nursing: { m: this.home, providerKey: 'provider_account_id', stateField: 'state' },
            consultation: { m: this.appts, providerKey: 'doctor_user_id', stateField: 'status' },
        };
        const cfg = models[kind];
        if (!cfg)
            throw new common_1.NotFoundException('unknown order kind');
        const doc = await cfg.m.findOne({ $or: [{ id }, { tracking_id: id }] }).lean();
        if (!doc)
            throw new common_1.NotFoundException('order not found');
        const [patient, provider] = await Promise.all([
            doc.patient_id ? this.users.findOne({ $or: [{ id: doc.patient_id }, { _id: doc.patient_id }] }, { id: 1, name: 1, full_name: 1, phone: 1, email: 1, _id: 0 }).lean() : null,
            doc[cfg.providerKey] ? this.providers.findOne({ $or: [{ account_id: doc[cfg.providerKey] }, { user_id: doc[cfg.providerKey] }, { id: doc[cfg.providerKey] }] }, { account_id: 1, display_name_ar: 1, display_name_en: 1, type: 1, _id: 0 }).lean() : null,
        ]);
        const history = (doc.state_history || doc.status_history || []).map((h) => ({
            from: h.from, to: h.to, note: h.note || h.reason || '', by: h.by_role || h.by_user_id || '', at: h.at,
        }));
        return {
            kind,
            id: doc.id,
            tracking_id: doc.tracking_id || doc.id,
            state: doc[cfg.stateField],
            universal_state: (0, workflow_engine_module_1.toUniversal)(kind, doc[cfg.stateField]),
            patient: patient ? { id: patient.id, name: patient.full_name || patient.name, phone: patient.phone, email: patient.email } : { id: doc.patient_id },
            provider: provider ? { id: provider.account_id, name: provider.display_name_ar || provider.display_name_en, type: provider.type } : { id: doc[cfg.providerKey] || null },
            total: doc.total || doc.price || 0,
            payment_method: doc.payment_method || null,
            address: doc.address || doc.delivery_address || null,
            items: doc.items || doc.services || [],
            history,
            created_at: doc.createdAt,
            updated_at: doc.updatedAt,
            raw: doc,
        };
    }
    async snapshot() {
        const [summary, liveBookings, failed, stuck, providersByStatus, perf] = await Promise.all([
            this.gov.globalSummary(),
            this.liveBookings(),
            this.failedTransactions(),
            this.stuckMatching(),
            this.providersLiveStatus(),
            this.gov.providersPerformance({ limit: 20 }),
        ]);
        return {
            summary,
            live_bookings: liveBookings,
            failed_transactions: failed,
            stuck_matching: stuck,
            providers_status: providersByStatus,
            top_providers: perf.slice(0, 10),
            bottom_providers: perf.slice(-10).reverse(),
            generated_at: new Date(),
        };
    }
};
exports.AdminCommandCenterService = AdminCommandCenterService;
exports.AdminCommandCenterService = AdminCommandCenterService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Order')),
    __param(1, (0, mongoose_1.InjectModel)('LabBooking')),
    __param(2, (0, mongoose_1.InjectModel)('RadiologyBooking')),
    __param(3, (0, mongoose_1.InjectModel)('HomeCareBooking')),
    __param(4, (0, mongoose_1.InjectModel)(appointment_schema_1.Appointment.name)),
    __param(5, (0, mongoose_1.InjectModel)('User')),
    __param(6, (0, mongoose_1.InjectModel)('ProviderProfile')),
    __param(7, (0, mongoose_1.InjectModel)('SystemEvent')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        admin_governance_module_1.AdminGovernanceService])
], AdminCommandCenterService);
let AdminCommandCenterController = class AdminCommandCenterController {
    constructor(svc) {
        this.svc = svc;
    }
    snapshot() { return this.svc.snapshot(); }
    orderDetail(kind, id) { return this.svc.orderDetail(kind, id); }
};
exports.AdminCommandCenterController = AdminCommandCenterController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminCommandCenterController.prototype, "snapshot", null);
__decorate([
    (0, common_1.Get)('order/:kind/:id'),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminCommandCenterController.prototype, "orderDetail", null);
exports.AdminCommandCenterController = AdminCommandCenterController = __decorate([
    (0, common_1.Controller)('admin/command-center'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [AdminCommandCenterService])
], AdminCommandCenterController);
const admin_governance_module_2 = require("../admin-governance/admin-governance.module");
let AdminCommandCenterModule = class AdminCommandCenterModule {
};
exports.AdminCommandCenterModule = AdminCommandCenterModule;
exports.AdminCommandCenterModule = AdminCommandCenterModule = __decorate([
    (0, common_1.Module)({
        imports: [
            admin_governance_module_2.AdminGovernanceModule,
            mongoose_1.MongooseModule.forFeature([
                { name: 'Order', schema: order_schema_1.OrderSchema },
                { name: 'LabBooking', schema: lab_schema_1.LabBookingSchema },
                { name: 'RadiologyBooking', schema: radiology_schema_1.RadiologyBookingSchema },
                { name: 'HomeCareBooking', schema: home_care_schema_1.HomeCareBookingSchema },
                { name: appointment_schema_1.Appointment.name, schema: appointment_schema_1.AppointmentSchema },
                { name: 'User', schema: user_schema_1.UserSchema },
                { name: 'ProviderProfile', schema: provider_profile_schema_1.ProviderProfileSchema },
                { name: 'SystemEvent', schema: system_event_schema_1.SystemEventSchema },
            ]),
        ],
        controllers: [AdminCommandCenterController],
        providers: [AdminCommandCenterService],
    })
], AdminCommandCenterModule);
//# sourceMappingURL=admin-command-center.module.js.map