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
exports.BookingFlowModule = exports.BookingFlowController = exports.BookingFlowService = void 0;
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
const system_event_schema_1 = require("../events/system-event.schema");
const enums_1 = require("../../common/enums");
const workflow_engine_module_1 = require("../workflow-engine/workflow-engine.module");
let BookingFlowService = class BookingFlowService {
    constructor(orders, labs, rads, home, appts, providers, events, engine) {
        this.orders = orders;
        this.labs = labs;
        this.rads = rads;
        this.home = home;
        this.appts = appts;
        this.providers = providers;
        this.events = events;
        this.engine = engine;
        this.kindAliases = {
            pharmacy: 'pharmacy', order: 'pharmacy',
            lab: 'lab', lab_booking: 'lab',
            radiology: 'radiology', radiology_booking: 'radiology',
            nursing: 'nursing', home_care: 'nursing', nursing_booking: 'nursing',
            consultation: 'consultation', doctor: 'consultation', appointment: 'consultation',
        };
    }
    isAdmin(user) {
        return user?.role === 'admin' || user?.role === 'super_admin';
    }
    isProvider(user) {
        return ['provider', 'pharmacy', 'lab', 'laboratory', 'radiology', 'nurse', 'nursing', 'hospital', 'doctor'].includes(String(user?.role || '').toLowerCase())
            || ['pharmacy', 'lab', 'laboratory', 'radiology', 'nursing', 'hospital', 'doctor'].includes(String(user?.provider_type || user?.providerType || '').toLowerCase());
    }
    providerOwnership(user) {
        return [{ provider_account_id: user.id }, { provider_id: user.id }, { doctor_user_id: user.id }, { pharmacy_id: user.id }];
    }
    async fetchEntity(kind, id, user) {
        const ownership = this.isAdmin(user) ? {} : user?.role === 'patient'
            ? { patient_id: user.id }
            : this.isProvider(user) ? { $or: this.providerOwnership(user) } : { patient_id: user.id };
        if (kind === 'pharmacy')
            return this.orders.findOne({ id, ...ownership }, { _id: 0, __v: 0 }).lean();
        if (kind === 'lab')
            return this.labs.findOne({ id, ...ownership }, { _id: 0, __v: 0 }).lean();
        if (kind === 'radiology')
            return this.rads.findOne({ id, ...ownership }, { _id: 0, __v: 0 }).lean();
        if (kind === 'nursing')
            return this.home.findOne({ id, ...ownership }, { _id: 0, __v: 0 }).lean();
        if (kind === 'consultation')
            return this.appts.findOne({ id, ...ownership }, { _id: 0, __v: 0 }).lean();
        return null;
    }
    domainStateOf(kind, entity) {
        return kind === 'consultation' ? (entity?.status || '') : (entity?.state || '');
    }
    entityTypeOf(kind) {
        return { pharmacy: 'order', lab: 'lab_booking', radiology: 'radiology_booking', nursing: 'nursing_booking', consultation: 'appointment' }[kind];
    }
    nextActions(kind, universal, role) {
        if ([enums_1.ServiceState.COMPLETED, enums_1.ServiceState.CANCELLED].includes(universal))
            return [];
        if (role === 'patient') {
            const acts = ['cancel'];
            if ([enums_1.ServiceState.ASSIGNED, enums_1.ServiceState.CONFIRMED].includes(universal) && ['lab', 'radiology', 'nursing', 'consultation'].includes(kind))
                acts.push('reschedule');
            if (universal === enums_1.ServiceState.MATCHING)
                acts.push('retry');
            return acts;
        }
        if (role === 'provider') {
            const acts = [];
            if (universal === enums_1.ServiceState.ASSIGNED) {
                acts.push('accept', 'reject');
            }
            if (universal === enums_1.ServiceState.CONFIRMED)
                acts.push('start');
            if (universal === enums_1.ServiceState.IN_PROGRESS)
                acts.push('complete');
            return acts;
        }
        if (role === 'admin')
            return ['force_cancel', 'force_advance', 'resolve'];
        return [];
    }
    recoveryOptions(kind, universal, entity) {
        const failed = universal === enums_1.ServiceState.MATCHING || ['ESCALATED_TO_ADMIN', 'EXPIRED'].includes(String(this.domainStateOf(kind, entity)).toUpperCase());
        if (!failed)
            return [];
        const opts = ['retry_broadcast', 'manual_assign', 'cancel'];
        if (kind === 'pharmacy')
            opts.push('escalate_to_admin');
        return opts;
    }
    buildSteps(kind, eventTypes) {
        const labels = {
            [enums_1.ServiceState.REQUESTED]: 'تم الإنشاء',
            [enums_1.ServiceState.MATCHING]: 'جاري البحث عن مزوّد',
            [enums_1.ServiceState.ASSIGNED]: 'تم التعيين',
            [enums_1.ServiceState.CONFIRMED]: 'تم التأكيد',
            [enums_1.ServiceState.IN_PROGRESS]: 'قيد التنفيذ',
            [enums_1.ServiceState.COMPLETED]: 'مكتمل',
            [enums_1.ServiceState.CANCELLED]: 'ملغي',
        };
        const evMap = {
            [enums_1.ServiceState.REQUESTED]: 'service.requested',
            [enums_1.ServiceState.MATCHING]: 'service.matched',
            [enums_1.ServiceState.ASSIGNED]: 'service.assigned',
            [enums_1.ServiceState.CONFIRMED]: 'service.confirmed',
            [enums_1.ServiceState.IN_PROGRESS]: 'service.started',
            [enums_1.ServiceState.COMPLETED]: 'service.completed',
            [enums_1.ServiceState.CANCELLED]: 'service.cancelled',
        };
        const ordered = [
            enums_1.ServiceState.REQUESTED, enums_1.ServiceState.MATCHING, enums_1.ServiceState.ASSIGNED,
            enums_1.ServiceState.CONFIRMED, enums_1.ServiceState.IN_PROGRESS, enums_1.ServiceState.COMPLETED,
        ];
        return ordered.map(s => ({ key: s, label: labels[s], reached: eventTypes.has(evMap[s]) }));
    }
    async providerSnapshot(entity, kind) {
        const accountId = entity?.provider_account_id || entity?.pharmacy_id || entity?.doctor_user_id;
        if (!accountId)
            return null;
        const p = await this.providers.findOne({ user_id: accountId }, { name_ar: 1, name_en: 1, phone: 1, city: 1, type: 1, rating: 1, _id: 0 }).lean();
        return p || { user_id: accountId };
    }
    async status(user, type, id) {
        const kind = this.kindAliases[type];
        if (!kind)
            throw new common_1.BadRequestException('invalid_type');
        const entity = await this.fetchEntity(kind, id, user);
        if (!entity)
            throw new common_1.NotFoundException();
        const domainState = this.domainStateOf(kind, entity);
        const universal = (0, workflow_engine_module_1.toUniversal)(kind, domainState);
        const provider = await this.providerSnapshot(entity, kind);
        const evDocs = await this.events.find({ entity_type: this.entityTypeOf(kind), entity_id: id }, { type: 1, _id: 0 }).lean();
        const evTypes = new Set(evDocs.map((e) => e.type));
        const steps = this.buildSteps(kind, evTypes);
        const role = user?.role || 'patient';
        const next_actions = this.nextActions(kind, universal, role);
        const recovery = this.recoveryOptions(kind, universal, entity);
        const failure = universal === enums_1.ServiceState.MATCHING && entity.createdAt && Date.now() - new Date(entity.createdAt).getTime() > 15 * 60000
            ? 'no_providers_responded_15m' : null;
        return {
            id,
            type: kind,
            tracking_id: entity.tracking_id || id,
            universal_state: universal,
            domain_state: domainState,
            provider,
            steps,
            next_actions,
            failure_state: failure,
            recovery_options: recovery,
            total: entity.total || entity.totals?.total || entity.price || 0,
            scheduled_at: entity.scheduled_at || entity.slot_start || null,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
        };
    }
    async timeline(user, type, id) {
        const kind = this.kindAliases[type];
        if (!kind)
            throw new common_1.BadRequestException('invalid_type');
        const entity = await this.fetchEntity(kind, id, user);
        if (!entity)
            throw new common_1.NotFoundException();
        const events = await this.events.find({ entity_type: this.entityTypeOf(kind), entity_id: id }, { _id: 0, __v: 0 }).sort({ createdAt: 1 }).lean();
        const state_history = entity.state_history || [];
        return { id, type: kind, state_history, events };
    }
    async retry(user, type, id) {
        const kind = this.kindAliases[type];
        if (!kind)
            throw new common_1.BadRequestException('invalid_type');
        const entity = await this.fetchEntity(kind, id, user);
        if (!entity)
            throw new common_1.NotFoundException();
        const universal = (0, workflow_engine_module_1.toUniversal)(kind, this.domainStateOf(kind, entity));
        if (universal !== enums_1.ServiceState.MATCHING && universal !== enums_1.ServiceState.REQUESTED) {
            throw new common_1.BadRequestException('not_retryable_in_current_state');
        }
        await this.engine.apply({
            kind, entity_id: id, from_domain: this.domainStateOf(kind, entity), to_domain: this.domainStateOf(kind, entity),
            actor_account_id: user.id, actor_role: user.role, reason: 'retry_requested',
            mutate: async () => ({ retried: true }),
        }).catch(() => null);
        return { ok: true, message: 'retry_dispatched' };
    }
    async resolve(user, type, id, body) {
        if (!this.isAdmin(user))
            throw new common_1.BadRequestException('admin_only');
        const kind = this.kindAliases[type];
        if (!kind)
            throw new common_1.BadRequestException('invalid_type');
        const entity = await this.fetchEntity(kind, id, user);
        if (!entity)
            throw new common_1.NotFoundException();
        const from = this.domainStateOf(kind, entity);
        const target = body.resolution === 'force_complete' ? enums_1.ServiceState.COMPLETED : enums_1.ServiceState.CANCELLED;
        return await this.engine.apply({
            kind, entity_id: id, from_domain: from, to_domain: target,
            actor_account_id: user.id, actor_role: 'admin', reason: body.reason || 'admin_resolution',
            mutate: async () => {
                const Model = kind === 'pharmacy' ? this.orders
                    : kind === 'lab' ? this.labs
                        : kind === 'radiology' ? this.rads
                            : kind === 'nursing' ? this.home
                                : this.appts;
                const field = kind === 'consultation' ? 'status' : 'state';
                const update = { [field]: target };
                const push = { state_history: { from, to: target, by_user_id: user.id, by_role: 'admin', at: new Date(), note: body.reason || 'admin_resolution' } };
                await Model.updateOne({ id }, { $set: update, $push: push });
                return { ok: true };
            },
        });
    }
};
exports.BookingFlowService = BookingFlowService;
exports.BookingFlowService = BookingFlowService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Order')),
    __param(1, (0, mongoose_1.InjectModel)('LabBooking')),
    __param(2, (0, mongoose_1.InjectModel)('RadiologyBooking')),
    __param(3, (0, mongoose_1.InjectModel)('HomeCareBooking')),
    __param(4, (0, mongoose_1.InjectModel)(appointment_schema_1.Appointment.name)),
    __param(5, (0, mongoose_1.InjectModel)('ProviderProfile')),
    __param(6, (0, mongoose_1.InjectModel)('SystemEvent')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        workflow_engine_module_1.WorkflowEngineService])
], BookingFlowService);
let BookingFlowController = class BookingFlowController {
    constructor(svc) {
        this.svc = svc;
    }
    status(u, t, id) { return this.svc.status(u, t, id); }
    timeline(u, t, id) { return this.svc.timeline(u, t, id); }
    retry(u, t, id) { return this.svc.retry(u, t, id); }
    resolve(u, t, id, b) { return this.svc.resolve(u, t, id, b); }
};
exports.BookingFlowController = BookingFlowController;
__decorate([
    (0, common_1.Get)('status/:type/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], BookingFlowController.prototype, "status", null);
__decorate([
    (0, common_1.Get)('timeline/:type/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], BookingFlowController.prototype, "timeline", null);
__decorate([
    (0, common_1.Post)('retry/:type/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], BookingFlowController.prototype, "retry", null);
__decorate([
    (0, common_1.Post)('resolve/:type/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], BookingFlowController.prototype, "resolve", null);
exports.BookingFlowController = BookingFlowController = __decorate([
    (0, common_1.Controller)('booking/flow'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [BookingFlowService])
], BookingFlowController);
let BookingFlowModule = class BookingFlowModule {
};
exports.BookingFlowModule = BookingFlowModule;
exports.BookingFlowModule = BookingFlowModule = __decorate([
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
                { name: 'SystemEvent', schema: system_event_schema_1.SystemEventSchema },
            ]),
        ],
        controllers: [BookingFlowController],
        providers: [BookingFlowService],
        exports: [BookingFlowService],
    })
], BookingFlowModule);
//# sourceMappingURL=booking-flow.module.js.map