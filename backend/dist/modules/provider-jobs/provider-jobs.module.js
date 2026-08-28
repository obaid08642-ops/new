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
exports.ProviderJobsModule = exports.ProviderJobsController = exports.ProviderJobsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const order_schema_1 = require("../../schemas/order.schema");
const lab_schema_1 = require("../../schemas/lab.schema");
const radiology_schema_1 = require("../../schemas/radiology.schema");
const home_care_schema_1 = require("../../schemas/home-care.schema");
const appointment_schema_1 = require("../../schemas/appointment.schema");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
const user_schema_1 = require("../../schemas/user.schema");
const booking_ops_module_1 = require("../booking-ops/booking-ops.module");
const enums_1 = require("../../common/enums");
const workflow_engine_module_1 = require("../workflow-engine/workflow-engine.module");
let ProviderJobsService = class ProviderJobsService {
    constructor(orders, labs, rads, home, appts, providers, users, attachments, engine) {
        this.orders = orders;
        this.labs = labs;
        this.rads = rads;
        this.home = home;
        this.appts = appts;
        this.providers = providers;
        this.users = users;
        this.attachments = attachments;
        this.engine = engine;
        this.kindAliases = {
            pharmacy: 'pharmacy', order: 'pharmacy',
            lab: 'lab', lab_booking: 'lab',
            radiology: 'radiology', radiology_booking: 'radiology',
            nursing: 'nursing', home_care: 'nursing', nursing_booking: 'nursing',
            consultation: 'consultation', doctor: 'consultation', appointment: 'consultation',
        };
    }
    bucket(universal) {
        if (universal === enums_1.ServiceState.ASSIGNED)
            return 'incoming';
        if ([enums_1.ServiceState.CONFIRMED, enums_1.ServiceState.IN_PROGRESS].includes(universal))
            return 'active';
        if (universal === enums_1.ServiceState.COMPLETED)
            return 'completed';
        return null;
    }
    async allowedKindsFor(user) {
        const all = ['pharmacy', 'lab', 'radiology', 'nursing', 'consultation'];
        if (user.role === 'admin' || user.role === 'provider')
            return new Set(all);
        const byRole = {
            pharmacy: ['pharmacy'],
            lab: ['lab'],
            radiology: ['radiology'],
            doctor: ['consultation'],
            home_care: ['nursing'],
            hospital: ['lab', 'radiology', 'consultation'],
            clinic: ['consultation'],
        };
        const base = byRole[user.role] || [];
        try {
            const profile = await this.providers.findOne({ user_id: user.id }, { capabilities: 1, _id: 0 }).lean();
            const caps = profile?.capabilities;
            if (Array.isArray(caps) && caps.length) {
                const map = { lab: 'lab', labs: 'lab', radiology: 'radiology', pharmacy: 'pharmacy', consultation: 'consultation', doctor: 'consultation', nursing: 'nursing', home_care: 'nursing' };
                const fromCaps = caps.map(c => map[c]).filter(Boolean);
                if (fromCaps.length)
                    return new Set(fromCaps);
            }
        }
        catch { }
        return new Set(base);
    }
    async queue(user, status = 'incoming', kindFilter) {
        const providerId = user.id;
        const allowedKinds = await this.allowedKindsFor(user);
        const filters = {
            incoming: ['ASSIGNED'].flatMap(u => ['pharmacy', 'lab', 'radiology', 'nursing', 'consultation'].map(k => `${k}:${u}`)),
            active: ['CONFIRMED', 'IN_PROGRESS'].flatMap(u => ['pharmacy', 'lab', 'radiology', 'nursing', 'consultation'].map(k => `${k}:${u}`)),
            completed: ['COMPLETED'].flatMap(u => ['pharmacy', 'lab', 'radiology', 'nursing', 'consultation'].map(k => `${k}:${u}`)),
        };
        const wantUniversals = status === 'incoming'
            ? [enums_1.ServiceState.ASSIGNED]
            : status === 'active'
                ? [enums_1.ServiceState.CONFIRMED, enums_1.ServiceState.IN_PROGRESS]
                : [enums_1.ServiceState.COMPLETED];
        const universalsToDomainStates = (kind) => wantUniversals.flatMap(u => (0, workflow_engine_module_1.domainStatesFor)(kind, u));
        const kindAllowed = (k) => allowedKinds.has(k) && (!kindFilter || this.kindAliases[kindFilter] === k);
        const [ordersJobs, labsJobs, radsJobs, homeJobs, apptsJobs] = await Promise.all([
            kindAllowed('pharmacy')
                ? this.orders.find({ pharmacy_id: providerId, state: { $in: universalsToDomainStates('pharmacy') } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean()
                : Promise.resolve([]),
            kindAllowed('lab')
                ? this.labs.find({ account_id: providerId, state: { $in: universalsToDomainStates('lab') } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean()
                : Promise.resolve([]),
            kindAllowed('radiology')
                ? this.rads.find({ account_id: providerId, state: { $in: universalsToDomainStates('radiology') } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean()
                : Promise.resolve([]),
            kindAllowed('nursing')
                ? this.home.find({ $or: [{ provider_id: providerId }, { account_id: providerId }], state: { $in: universalsToDomainStates('nursing') } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean()
                : Promise.resolve([]),
            kindAllowed('consultation')
                ? this.appts.find({ $or: [{ doctor_user_id: providerId }, { account_id: providerId }], status: { $in: universalsToDomainStates('consultation') } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean()
                : Promise.resolve([]),
        ]);
        const map = (kind, x) => ({
            kind,
            id: x.id,
            tracking_id: x.tracking_id || x.id,
            patient_id: x.patient_id,
            universal_state: (0, workflow_engine_module_1.toUniversal)(kind, kind === 'consultation' ? x.status : x.state),
            domain_state: kind === 'consultation' ? x.status : x.state,
            total: x.total || x.totals?.total || x.price || 0,
            scheduled_at: x.scheduled_at || x.slot_start || null,
            title_ar: x.items?.[0]?.name_ar || x.service_name_ar || (kind === 'pharmacy' ? 'طلب صيدلية' : kind === 'lab' ? 'تحاليل' : kind === 'radiology' ? 'أشعة' : kind === 'nursing' ? 'رعاية منزلية' : 'استشارة'),
            payment_method: x.payment_method || 'cash',
            payment_status: x.payment_status || (x.payment_method === 'cash' ? 'cash_on_delivery' : 'pending'),
            insurance_provider: x.insurance_provider || null,
            insurance_status: x.insurance_status || null,
            address: x.address || x.delivery_address || null,
            contact: x.contact || null,
            service_type: x.service_type || null,
            createdAt: x.createdAt,
            updatedAt: x.updatedAt,
        });
        const combined = [
            ...ordersJobs.map(o => map('pharmacy', o)),
            ...labsJobs.map(l => map('lab', l)),
            ...radsJobs.map(r => map('radiology', r)),
            ...homeJobs.map(h => map('nursing', h)),
            ...apptsJobs.map((a) => map('consultation', a)),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const patientIds = Array.from(new Set(combined.map(c => c.patient_id).filter(Boolean)));
        const ids = combined.map(c => c.id);
        const [users, attachmentCounts, profiles] = await Promise.all([
            patientIds.length ? this.users.find({ id: { $in: patientIds } }, { id: 1, full_name: 1, phone: 1, _id: 0 }).lean() : [],
            ids.length ? this.attachments.aggregate([
                { $match: { booking_id: { $in: ids } } },
                { $group: { _id: '$booking_id', n: { $sum: 1 } } },
            ]) : [],
            patientIds.length ? this.users.db.collection('patientprofiles').find({ user_id: { $in: patientIds } }, { projection: { user_id: 1, age: 1, gender: 1, blood_type: 1, allergies: 1, chronic_diseases: 1 } }).toArray() : [],
        ]);
        const userMap = new Map(users.map((u) => [u.id, u]));
        const attMap = new Map(attachmentCounts.map((a) => [a._id, a.n]));
        const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
        return combined.map((c) => ({
            ...c,
            patient_name: userMap.get(c.patient_id)?.full_name || null,
            patient_phone: userMap.get(c.patient_id)?.phone || null,
            patient_age: profileMap.get(c.patient_id)?.age ?? null,
            patient_gender: profileMap.get(c.patient_id)?.gender || null,
            patient_blood_type: profileMap.get(c.patient_id)?.blood_type || null,
            patient_allergies: profileMap.get(c.patient_id)?.allergies || [],
            patient_chronic: profileMap.get(c.patient_id)?.chronic_diseases || [],
            attachments_count: attMap.get(c.id) || 0,
        }));
    }
    async findEntity(kind, id, providerId) {
        let entity = null;
        if (kind === 'pharmacy')
            entity = await this.orders.findOne({ id, pharmacy_id: providerId });
        else if (kind === 'lab')
            entity = await this.labs.findOne({ id, account_id: providerId });
        else if (kind === 'radiology')
            entity = await this.rads.findOne({ id, account_id: providerId });
        else if (kind === 'nursing')
            entity = await this.home.findOne({ id, $or: [{ provider_id: providerId }, { account_id: providerId }] });
        else if (kind === 'consultation')
            entity = await this.appts.findOne({ id, $or: [{ doctor_user_id: providerId }, { account_id: providerId }] });
        if (!entity)
            throw new common_1.NotFoundException('job_not_found_or_not_yours');
        return entity;
    }
    async act(user, type, id, target, reason) {
        if (!['provider', 'pharmacy', 'lab', 'radiology', 'doctor', 'admin'].includes(user.role))
            throw new common_1.ForbiddenException('provider_only');
        const kind = this.kindAliases[type];
        if (!kind)
            throw new common_1.NotFoundException('invalid_type');
        const entity = await this.findEntity(kind, id, user.id);
        const field = kind === 'consultation' ? 'status' : 'state';
        const from = entity[field];
        const domainLiteralFor = {
            [enums_1.ServiceState.REQUESTED]: { pharmacy: 'CREATED', lab: 'CREATED', radiology: 'PENDING', nursing: 'CREATED', consultation: 'PENDING' },
            [enums_1.ServiceState.MATCHING]: { pharmacy: 'BROADCAST', lab: 'CREATED', radiology: 'PENDING', nursing: 'BROADCASTING', consultation: 'PENDING' },
            [enums_1.ServiceState.ASSIGNED]: { pharmacy: 'PHARMACY_RECEIVED', lab: 'CREATED', radiology: 'PENDING', nursing: 'PROVIDER_ASSIGNED', consultation: 'PENDING' },
            [enums_1.ServiceState.CONFIRMED]: { pharmacy: 'ACCEPTED', lab: 'CONFIRMED', radiology: 'CONFIRMED', nursing: 'CONFIRMED', consultation: 'CONFIRMED' },
            [enums_1.ServiceState.IN_PROGRESS]: { pharmacy: 'PREPARING', lab: 'SAMPLE_COLLECTED', radiology: 'IN_PROGRESS', nursing: 'IN_PROGRESS', consultation: 'IN_PROGRESS' },
            [enums_1.ServiceState.COMPLETED]: { pharmacy: 'DELIVERED', lab: 'REPORTED', radiology: 'REPORT_PUBLISHED', nursing: 'COMPLETED', consultation: 'COMPLETED' },
            [enums_1.ServiceState.CANCELLED]: { pharmacy: 'CANCELLED', lab: 'CANCELLED', radiology: 'CANCELLED', nursing: 'CANCELLED', consultation: 'CANCELLED' },
        };
        const toDomain = domainLiteralFor[target][kind];
        return await this.engine.apply({
            kind, entity_id: id, from_domain: from, to_domain: toDomain,
            actor_account_id: user.id, actor_role: 'provider', patient_account_id: entity.patient_id, reason,
            mutate: async () => {
                const Model = kind === 'pharmacy' ? this.orders
                    : kind === 'lab' ? this.labs
                        : kind === 'radiology' ? this.rads
                            : kind === 'nursing' ? this.home
                                : this.appts;
                entity[field] = toDomain;
                (entity.state_history = entity.state_history || []).push({ from, to: toDomain, by_user_id: user.id, by_role: 'provider', at: new Date(), note: reason });
                await entity.save();
                return entity.toObject();
            },
        });
    }
    accept(user, type, id, reason) { return this.act(user, type, id, enums_1.ServiceState.CONFIRMED, reason || 'provider_accepted'); }
    reject(user, type, id, reason) { return this.act(user, type, id, enums_1.ServiceState.CANCELLED, reason || 'provider_rejected'); }
    start(user, type, id, reason) { return this.act(user, type, id, enums_1.ServiceState.IN_PROGRESS, reason || 'provider_started'); }
    complete(user, type, id, reason) { return this.act(user, type, id, enums_1.ServiceState.COMPLETED, reason || 'provider_completed'); }
    async updateInsurance(user, type, id, insuranceDetails) {
        if (!['provider', 'pharmacy', 'lab', 'radiology', 'doctor', 'admin'].includes(user.role)) {
            throw new common_1.ForbiddenException('provider_only');
        }
        const kind = this.kindAliases[type];
        if (!kind)
            throw new common_1.NotFoundException('invalid_type');
        const entity = await this.findEntity(kind, id, user.id);
        const status = insuranceDetails?.approvalStatus || 'PENDING';
        entity.insurance_details = {
            ...(entity.insurance_details || {}),
            ...insuranceDetails,
            approvalStatus: status,
            ...(status === 'APPROVED' ? { approvalDate: new Date(), approvedBy: user.id } : {}),
            submittedBy: user.id,
            submittedAt: new Date(),
        };
        if (entity.markModified) {
            entity.markModified('insurance_details');
        }
        await entity.save();
        return entity.toObject();
    }
};
exports.ProviderJobsService = ProviderJobsService;
exports.ProviderJobsService = ProviderJobsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Order')),
    __param(1, (0, mongoose_1.InjectModel)('LabBooking')),
    __param(2, (0, mongoose_1.InjectModel)('RadiologyBooking')),
    __param(3, (0, mongoose_1.InjectModel)('HomeCareBooking')),
    __param(4, (0, mongoose_1.InjectModel)(appointment_schema_1.Appointment.name)),
    __param(5, (0, mongoose_1.InjectModel)('ProviderProfile')),
    __param(6, (0, mongoose_1.InjectModel)('User')),
    __param(7, (0, mongoose_1.InjectModel)('BookingAttachment')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        workflow_engine_module_1.WorkflowEngineService])
], ProviderJobsService);
let ProviderJobsController = class ProviderJobsController {
    constructor(svc) {
        this.svc = svc;
    }
    queue(u, q) { return this.svc.queue(u, q.status || 'incoming', q.kind); }
    async myCaps(u) {
        const set = await this.svc.allowedKindsFor(u);
        return { role: u.role, capabilities: Array.from(set) };
    }
    accept(u, t, id, b) { return this.svc.accept(u, t, id, b?.reason); }
    reject(u, t, id, b) { return this.svc.reject(u, t, id, b?.reason); }
    start(u, t, id, b) { return this.svc.start(u, t, id, b?.reason); }
    complete(u, t, id, b) { return this.svc.complete(u, t, id, b?.reason); }
    insurance(u, t, id, b) { return this.svc.updateInsurance(u, t, id, b); }
};
exports.ProviderJobsController = ProviderJobsController;
__decorate([
    (0, common_1.Get)('queue'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderJobsController.prototype, "queue", null);
__decorate([
    (0, common_1.Get)('my-capabilities'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProviderJobsController.prototype, "myCaps", null);
__decorate([
    (0, common_1.Post)(':type/:id/accept'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderJobsController.prototype, "accept", null);
__decorate([
    (0, common_1.Post)(':type/:id/reject'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderJobsController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(':type/:id/start'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderJobsController.prototype, "start", null);
__decorate([
    (0, common_1.Post)(':type/:id/complete'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderJobsController.prototype, "complete", null);
__decorate([
    (0, common_1.Post)(':type/:id/insurance'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderJobsController.prototype, "insurance", null);
exports.ProviderJobsController = ProviderJobsController = __decorate([
    (0, common_1.Controller)('provider/jobs'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ProviderJobsService])
], ProviderJobsController);
let ProviderJobsModule = class ProviderJobsModule {
};
exports.ProviderJobsModule = ProviderJobsModule;
exports.ProviderJobsModule = ProviderJobsModule = __decorate([
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
                { name: 'User', schema: user_schema_1.UserSchema },
                { name: 'BookingAttachment', schema: booking_ops_module_1.BookingAttachmentSchema },
            ]),
        ],
        controllers: [ProviderJobsController],
        providers: [ProviderJobsService],
        exports: [ProviderJobsService],
    })
], ProviderJobsModule);
//# sourceMappingURL=provider-jobs.module.js.map