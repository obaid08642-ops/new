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
exports.AdminGovernanceModule = exports.CommissionsController = exports.KillSwitchesController = exports.AdminGovernanceController = exports.AdminGovernanceService = void 0;
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
const b2b_request_schema_1 = require("../../schemas/b2b-request.schema");
const b2b_controller_1 = require("./b2b.controller");
const system_config_controller_1 = require("./system-config.controller");
let AdminGovernanceService = class AdminGovernanceService {
    constructor(orders, labs, rads, home, appts, users, providers, events) {
        this.orders = orders;
        this.labs = labs;
        this.rads = rads;
        this.home = home;
        this.appts = appts;
        this.users = users;
        this.providers = providers;
        this.events = events;
    }
    scoreBucket(items) {
        let total = items.length, completed = 0, cancelled = 0, accepted = 0, delayed = 0;
        let sum_response_min = 0, response_count = 0;
        for (const it of items) {
            const us = (0, workflow_engine_module_1.toUniversal)(it.kind, it.state);
            if (us === enums_1.ServiceState.COMPLETED)
                completed++;
            if (us === enums_1.ServiceState.CANCELLED)
                cancelled++;
            const acceptedEvt = (it.state_history || []).find((s) => [enums_1.ServiceState.ASSIGNED, enums_1.ServiceState.CONFIRMED].includes((0, workflow_engine_module_1.toUniversal)(it.kind, s.to)));
            if (acceptedEvt) {
                accepted++;
                const ms = new Date(acceptedEvt.at).getTime() - new Date(it.createdAt).getTime();
                sum_response_min += ms / 60000;
                response_count++;
            }
            if (it.scheduled_at) {
                const lastComplete = (it.state_history || []).slice().reverse().find((s) => (0, workflow_engine_module_1.toUniversal)(it.kind, s.to) === enums_1.ServiceState.COMPLETED);
                if (lastComplete && new Date(lastComplete.at).getTime() > new Date(it.scheduled_at).getTime() + 60 * 60000)
                    delayed++;
            }
        }
        const acceptance_rate = total > 0 ? Math.round((accepted / total) * 100) : 0;
        const completion_rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const cancellation_rate = total > 0 ? Math.round((cancelled / total) * 100) : 0;
        const delay_rate = total > 0 ? Math.round((delayed / total) * 100) : 0;
        const avg_response_min = response_count > 0 ? Math.round(sum_response_min / response_count) : 0;
        const score = Math.round(completion_rate * 0.5 + acceptance_rate * 0.2 + Math.max(0, 100 - avg_response_min) * 0.2 + Math.max(0, 100 - delay_rate * 5) * 0.1);
        return { total, accepted, completed, cancelled, delayed, acceptance_rate, completion_rate, cancellation_rate, delay_rate, avg_response_min, score };
    }
    async providersPerformance(filter = {}) {
        const q = { status: { $ne: 'suspended' } };
        if (filter.type)
            q.type = filter.type;
        const profiles = await this.providers.find(q, { _id: 0, __v: 0, license_documents: 0 }).limit(Math.min(filter.limit || 100, 200)).lean();
        const since = new Date(Date.now() - 60 * 86400000);
        const out = [];
        for (const p of profiles) {
            let items = [];
            let kind = 'pharmacy';
            if (p.type === 'pharmacy') {
                kind = 'pharmacy';
                items = await this.orders.find({ pharmacy_id: p.user_id, createdAt: { $gte: since } }, { state: 1, state_history: 1, createdAt: 1, scheduled_at: 1 }).lean();
            }
            else if (p.type === 'lab') {
                kind = 'lab';
                items = await this.labs.find({ account_id: p.user_id, createdAt: { $gte: since } }, { state: 1, state_history: 1, createdAt: 1, scheduled_at: 1 }).lean();
            }
            else if (p.type === 'radiology') {
                kind = 'radiology';
                items = await this.rads.find({ account_id: p.user_id, createdAt: { $gte: since } }, { state: 1, state_history: 1, createdAt: 1, scheduled_at: 1 }).lean();
            }
            else if (p.type === 'home_care') {
                kind = 'nursing';
                items = await this.home.find({ account_id: p.user_id, createdAt: { $gte: since } }, { state: 1, state_history: 1, createdAt: 1, scheduled_at: 1 }).lean();
            }
            else if (p.type === 'doctor' || p.type === 'clinic' || p.type === 'hospital') {
                kind = 'consultation';
                const itemsAppt = await this.appts.find({ $or: [{ doctor_id: p.id }, { doctor_user_id: p.user_id }, { account_id: p.user_id }], createdAt: { $gte: since } }, { status: 1, state_history: 1, createdAt: 1, slot_start: 1 }).lean();
                items = itemsAppt.map((a) => ({ ...a, state: a.status, scheduled_at: a.slot_start }));
            }
            const itemsWithKind = items.map(i => ({ ...i, kind }));
            const m = this.scoreBucket(itemsWithKind);
            out.push({
                provider_id: p.id, user_id: p.user_id, name_ar: p.name_ar, type: p.type, city: p.city,
                rating: p.rating || 0, total_60d: m.total, ...m,
            });
        }
        return out.sort((a, b) => b.score - a.score);
    }
    async patientProfile(patient_id) {
        const user = await this.users.findOne({ id: patient_id }, { password_hash: 0, _id: 0, __v: 0 }).lean();
        if (!user)
            return { error: 'not_found' };
        const since = new Date(Date.now() - 365 * 86400000);
        const [orders, labs, rads, home, appts, recentEvents] = await Promise.all([
            this.orders.find({ patient_id, createdAt: { $gte: since } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200).lean(),
            this.labs.find({ patient_id, createdAt: { $gte: since } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean(),
            this.rads.find({ patient_id, createdAt: { $gte: since } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean(),
            this.home.find({ patient_id, createdAt: { $gte: since } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean(),
            this.appts.find({ patient_id, createdAt: { $gte: since } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean(),
            this.events.find({ actor_account_id: patient_id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean(),
        ]);
        const isActive = (kind, st) => ![enums_1.ServiceState.COMPLETED, enums_1.ServiceState.CANCELLED].includes((0, workflow_engine_module_1.toUniversal)(kind, st));
        const activeOrders = orders.filter(o => isActive('pharmacy', o.state));
        const activeLabs = labs.filter(b => isActive('lab', b.state));
        const activeRads = rads.filter(b => isActive('radiology', b.state));
        const activeHome = home.filter(b => isActive('nursing', b.state));
        const activeAppts = appts.filter((a) => isActive('consultation', a.status));
        const ins_usage = {
            orders_using_insurance: orders.filter(o => o.payment_method === 'insurance').length,
            labs_using_insurance: labs.filter(b => b.payment_method === 'insurance').length,
            rads_using_insurance: rads.filter(b => b.payment_method === 'insurance').length,
            insurance_providers: Array.from(new Set([
                ...labs.map(b => b.insurance_provider).filter(Boolean),
                ...rads.map(b => b.insurance_provider).filter(Boolean),
            ])),
        };
        return {
            user, summary: {
                total_orders: orders.length, active_orders: activeOrders.length,
                total_labs: labs.length, active_labs: activeLabs.length,
                total_rads: rads.length, active_rads: activeRads.length,
                total_nursing: home.length, active_nursing: activeHome.length,
                total_consultation: appts.length, active_consultation: activeAppts.length,
                spend_estimate: orders.reduce((s, o) => s + (o.total || 0), 0)
                    + labs.reduce((s, b) => s + (b.total || 0), 0)
                    + rads.reduce((s, b) => s + (b.total || 0), 0)
                    + home.reduce((s, b) => s + (b.total || 0), 0)
                    + appts.reduce((s, a) => s + (a.price || 0), 0),
            }, insurance_usage: ins_usage,
            active: {
                orders: activeOrders.slice(0, 10),
                labs: activeLabs.slice(0, 10),
                rads: activeRads.slice(0, 10),
                nursing: activeHome.slice(0, 10),
                consultation: activeAppts.slice(0, 10),
            },
            history: {
                orders: orders.slice(0, 50),
                labs: labs.slice(0, 30),
                rads: rads.slice(0, 30),
                nursing: home.slice(0, 30),
                consultation: appts.slice(0, 30),
            },
            recent_events: recentEvents,
        };
    }
    async entityTrace(entity_type, entity_id) {
        const events = await this.events.find({ entity_type, entity_id }, { _id: 0, __v: 0 }).sort({ createdAt: 1 }).lean();
        let entity = null;
        let state_history = [];
        if (entity_type === 'order' || entity_type === 'pharmacy_order') {
            entity = await this.orders.findOne({ id: entity_id }, { _id: 0, __v: 0 }).lean();
            state_history = entity?.state_history || [];
        }
        else if (entity_type === 'lab_booking') {
            entity = await this.labs.findOne({ id: entity_id }, { _id: 0, __v: 0 }).lean();
            state_history = entity?.state_history || [];
        }
        else if (entity_type === 'radiology_booking') {
            entity = await this.rads.findOne({ id: entity_id }, { _id: 0, __v: 0 }).lean();
            state_history = entity?.state_history || [];
        }
        else if (entity_type === 'nursing_booking') {
            entity = await this.home.findOne({ id: entity_id }, { _id: 0, __v: 0 }).lean();
            state_history = entity?.state_history || [];
        }
        else if (entity_type === 'appointment') {
            entity = await this.appts.findOne({ id: entity_id }, { _id: 0, __v: 0 }).lean();
            state_history = entity?.state_history || [];
        }
        return { entity, events, state_history };
    }
    async globalSummary() {
        const activePharmacy = (0, workflow_engine_module_1.domainStatesFor)('pharmacy', enums_1.ServiceState.CANCELLED).concat((0, workflow_engine_module_1.domainStatesFor)('pharmacy', enums_1.ServiceState.COMPLETED));
        const activeLab = (0, workflow_engine_module_1.domainStatesFor)('lab', enums_1.ServiceState.CANCELLED).concat((0, workflow_engine_module_1.domainStatesFor)('lab', enums_1.ServiceState.COMPLETED));
        const activeRad = (0, workflow_engine_module_1.domainStatesFor)('radiology', enums_1.ServiceState.CANCELLED).concat((0, workflow_engine_module_1.domainStatesFor)('radiology', enums_1.ServiceState.COMPLETED));
        const activeNur = (0, workflow_engine_module_1.domainStatesFor)('nursing', enums_1.ServiceState.CANCELLED).concat((0, workflow_engine_module_1.domainStatesFor)('nursing', enums_1.ServiceState.COMPLETED));
        const activeCon = (0, workflow_engine_module_1.domainStatesFor)('consultation', enums_1.ServiceState.CANCELLED).concat((0, workflow_engine_module_1.domainStatesFor)('consultation', enums_1.ServiceState.COMPLETED));
        const [ordersTotal, ordersActive, labsTotal, labsActive, radsTotal, radsActive, homeTotal, homeActive, apptsTotal, apptsActive, providersTotal, providersActive, patientsTotal, eventsLast24h,] = await Promise.all([
            this.orders.estimatedDocumentCount(),
            this.orders.countDocuments({ state: { $nin: activePharmacy } }),
            this.labs.estimatedDocumentCount(),
            this.labs.countDocuments({ state: { $nin: activeLab } }),
            this.rads.estimatedDocumentCount(),
            this.rads.countDocuments({ state: { $nin: activeRad } }),
            this.home.estimatedDocumentCount(),
            this.home.countDocuments({ state: { $nin: activeNur } }),
            this.appts.estimatedDocumentCount(),
            this.appts.countDocuments({ status: { $nin: activeCon } }),
            this.providers.estimatedDocumentCount(),
            this.providers.countDocuments({ status: 'active' }),
            this.users.countDocuments({ role: 'patient' }),
            this.events.countDocuments({ createdAt: { $gte: new Date(Date.now() - 86400000) } }),
        ]);
        return {
            orders: { total: ordersTotal, active: ordersActive },
            labs: { total: labsTotal, active: labsActive },
            radiology: { total: radsTotal, active: radsActive },
            nursing: { total: homeTotal, active: homeActive },
            consultation: { total: apptsTotal, active: apptsActive },
            providers: { total: providersTotal, active: providersActive },
            patients: { total: patientsTotal },
            events_last_24h: eventsLast24h,
            generated_at: new Date(),
        };
    }
};
exports.AdminGovernanceService = AdminGovernanceService;
exports.AdminGovernanceService = AdminGovernanceService = __decorate([
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
        mongoose_2.Model])
], AdminGovernanceService);
const system_config_schema_1 = require("../../schemas/system-config.schema");
let AdminGovernanceController = class AdminGovernanceController {
    constructor(svc) {
        this.svc = svc;
    }
    summary() { return this.svc.globalSummary(); }
    perf(q) { return this.svc.providersPerformance({ type: q.type, limit: q.limit ? Number(q.limit) : undefined }); }
    patient(id) { return this.svc.patientProfile(id); }
    trace(et, ei) { return this.svc.entityTrace(et, ei); }
};
exports.AdminGovernanceController = AdminGovernanceController;
__decorate([
    (0, common_1.Get)('summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminGovernanceController.prototype, "summary", null);
__decorate([
    (0, common_1.Get)('providers-performance'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminGovernanceController.prototype, "perf", null);
__decorate([
    (0, common_1.Get)('patient/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminGovernanceController.prototype, "patient", null);
__decorate([
    (0, common_1.Get)('trace/:entity_type/:entity_id'),
    __param(0, (0, common_1.Param)('entity_type')),
    __param(1, (0, common_1.Param)('entity_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminGovernanceController.prototype, "trace", null);
exports.AdminGovernanceController = AdminGovernanceController = __decorate([
    (0, common_1.Controller)('admin/governance'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [AdminGovernanceService])
], AdminGovernanceController);
let KillSwitchesController = class KillSwitchesController {
    constructor(configModel) {
        this.configModel = configModel;
        this.defaultSwitches = [
            { id: "KS001", name: "الشات الكامل", key: "chat_enabled", value: true, description: "إيقاف يوقف جميع المحادثات في التطبيق فوراً", danger: true },
            { id: "KS002", name: "الكشوفات الأونلاين", key: "online_consultations", value: true, description: "إيقاف حجوزات الفيديو والاستشارات عن بعد", danger: true },
            { id: "KS003", name: "سحب الأرباح للمزودين", key: "provider_withdrawals", value: true, description: "تجميد سحب الأرباح من محافظ المزودين", danger: true },
            { id: "KS004", name: "بروكاست الصيدلية", key: "pharmacy_broadcast", value: true, description: "إيقاف إرسال طلبات الأدوية للصيدليات", danger: false },
            { id: "KS005", name: "بروكاست التمريض", key: "nursing_broadcast", value: true, description: "إيقاف إرسال طلبات التمريض المنزلي", danger: false },
            { id: "KS006", name: "التسجيل الجديد", key: "new_registrations", value: true, description: "إيقاف تسجيل مزودين ومرضى جدد", danger: false },
            { id: "KS007", name: "نظام الطوارئ والإسعاف", key: "emergency_system", value: true, description: "إيقاف زر الاستغاثة وإرسال الإسعاف", danger: true },
            { id: "KS008", name: "نشر التقييمات", key: "reviews_enabled", value: true, description: "إيقاف نشر تقييمات ومراجعات المرضى الجديدة", danger: false },
            { id: "KS009", name: "الدفع الإلكتروني", key: "online_payments", value: true, description: "إيقاف بوابات الدفع — الطلبات كاش فقط", danger: true },
        ];
    }
    async list() {
        let config = await this.configModel.findOne({ key: 'kill_switches' });
        if (!config) {
            config = await this.configModel.create({ key: 'kill_switches', value: this.defaultSwitches });
        }
        return config.value;
    }
    async toggle(key, body) {
        let config = await this.configModel.findOne({ key: 'kill_switches' });
        if (!config) {
            config = await this.configModel.create({ key: 'kill_switches', value: this.defaultSwitches });
        }
        const list = [...config.value];
        const sw = list.find(s => s.key === key);
        if (sw) {
            sw.value = body.value;
            config.value = list;
            config.markModified('value');
            await config.save();
        }
        return config.value;
    }
};
exports.KillSwitchesController = KillSwitchesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], KillSwitchesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(':key'),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], KillSwitchesController.prototype, "toggle", null);
exports.KillSwitchesController = KillSwitchesController = __decorate([
    (0, common_1.Controller)('kill-switches'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, mongoose_1.InjectModel)(system_config_schema_1.SystemConfig.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], KillSwitchesController);
let CommissionsController = class CommissionsController {
    constructor(profiles, orders, labs, rads, home, appts) {
        this.profiles = profiles;
        this.orders = orders;
        this.labs = labs;
        this.rads = rads;
        this.home = home;
        this.appts = appts;
    }
    async list() {
        const list = await this.profiles.find({}, { account_id: 1, name_ar: 1, type: 1, commission_rate: 1 }).lean();
        const since = new Date(Date.now() - 30 * 86400000);
        const out = [];
        for (const p of list) {
            const commission = p.commission_rate !== undefined ? p.commission_rate : (p.type === 'pharmacy' ? 5 : p.type === 'lab' ? 8 : p.type === 'radiology' ? 10 : p.type === 'home_care' ? 15 : 10);
            let revenue = 0;
            if (p.type === 'pharmacy') {
                const ords = await this.orders.find({ pharmacy_id: p.account_id, state: 'completed', createdAt: { $gte: since } }, { total: 1 }).lean();
                revenue = ords.reduce((sum, o) => sum + (o.total || 0), 0);
            }
            else if (p.type === 'lab') {
                const lbs = await this.labs.find({ account_id: p.account_id, state: 'completed', createdAt: { $gte: since } }, { total: 1 }).lean();
                revenue = lbs.reduce((sum, b) => sum + (b.total || 0), 0);
            }
            else if (p.type === 'radiology') {
                const rds = await this.rads.find({ account_id: p.account_id, state: 'completed', createdAt: { $gte: since } }, { total: 1 }).lean();
                revenue = rds.reduce((sum, b) => sum + (b.total || 0), 0);
            }
            else if (p.type === 'home_care') {
                const hc = await this.home.find({ account_id: p.account_id, state: 'completed', createdAt: { $gte: since } }, { total: 1 }).lean();
                revenue = hc.reduce((sum, b) => sum + (b.total || 0), 0);
            }
            else if (['doctor', 'clinic', 'hospital'].includes(p.type)) {
                const apts = await this.appts.find({ $or: [{ doctor_user_id: p.account_id }, { account_id: p.account_id }], status: 'completed', createdAt: { $gte: since } }, { price: 1 }).lean();
                revenue = apts.reduce((sum, a) => sum + (a.price || 0), 0);
            }
            const earnings = Math.round((revenue * commission) / 100);
            out.push({
                id: p.account_id,
                name: p.name_ar || p.account_id,
                type: p.type,
                commission,
                revenue,
                earnings,
            });
        }
        return out;
    }
    async update(id, body) {
        await this.profiles.updateOne({ account_id: id }, { $set: { commission_rate: Number(body.commission) } });
        return { success: true };
    }
};
exports.CommissionsController = CommissionsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CommissionsController.prototype, "list", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CommissionsController.prototype, "update", null);
exports.CommissionsController = CommissionsController = __decorate([
    (0, common_1.Controller)('commissions'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, mongoose_1.InjectModel)('ProviderProfile')),
    __param(1, (0, mongoose_1.InjectModel)('Order')),
    __param(2, (0, mongoose_1.InjectModel)('LabBooking')),
    __param(3, (0, mongoose_1.InjectModel)('RadiologyBooking')),
    __param(4, (0, mongoose_1.InjectModel)('HomeCareBooking')),
    __param(5, (0, mongoose_1.InjectModel)(appointment_schema_1.Appointment.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], CommissionsController);
let AdminGovernanceModule = class AdminGovernanceModule {
};
exports.AdminGovernanceModule = AdminGovernanceModule;
exports.AdminGovernanceModule = AdminGovernanceModule = __decorate([
    (0, common_1.Module)({
        imports: [
            workflow_engine_module_1.WorkflowEngineModule,
            mongoose_1.MongooseModule.forFeature([
                { name: 'Order', schema: order_schema_1.OrderSchema },
                { name: 'LabBooking', schema: lab_schema_1.LabBookingSchema },
                { name: 'RadiologyBooking', schema: radiology_schema_1.RadiologyBookingSchema },
                { name: 'HomeCareBooking', schema: home_care_schema_1.HomeCareBookingSchema },
                { name: appointment_schema_1.Appointment.name, schema: appointment_schema_1.AppointmentSchema },
                { name: 'User', schema: user_schema_1.UserSchema },
                { name: 'ProviderProfile', schema: provider_profile_schema_1.ProviderProfileSchema },
                { name: 'SystemEvent', schema: system_event_schema_1.SystemEventSchema },
                { name: system_config_schema_1.SystemConfig.name, schema: system_config_schema_1.SystemConfigSchema },
                { name: 'B2BRequest', schema: b2b_request_schema_1.B2BRequestSchema },
            ]),
        ],
        controllers: [AdminGovernanceController, KillSwitchesController, CommissionsController, b2b_controller_1.B2BController, system_config_controller_1.SystemConfigController],
        providers: [AdminGovernanceService],
        exports: [AdminGovernanceService],
    })
], AdminGovernanceModule);
//# sourceMappingURL=admin-governance.module.js.map