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
exports.AdminAuthorityModule = exports.AdminAuthorityController = exports.AdminAuthorityService = exports.AdminActionLogSchema = exports.AdminActionLog = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const jwt_1 = require("@nestjs/jwt");
const enums_1 = require("../../common/enums");
const order_schema_1 = require("../../schemas/order.schema");
const enums_2 = require("../../common/enums");
const event_bus_service_1 = require("../events/event-bus.service");
const user_schema_1 = require("../../schemas/user.schema");
const lab_schema_1 = require("../../schemas/lab.schema");
const radiology_schema_1 = require("../../schemas/radiology.schema");
const mongoose_3 = require("@nestjs/mongoose");
const mongoose_4 = require("mongoose");
const appointment_schema_1 = require("../../schemas/appointment.schema");
const uuid_1 = require("uuid");
let AdminActionLog = class AdminActionLog extends mongoose_4.Document {
};
exports.AdminActionLog = AdminActionLog;
__decorate([
    (0, mongoose_3.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], AdminActionLog.prototype, "id", void 0);
__decorate([
    (0, mongoose_3.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], AdminActionLog.prototype, "action", void 0);
__decorate([
    (0, mongoose_3.Prop)({ required: true }),
    __metadata("design:type", String)
], AdminActionLog.prototype, "admin_id", void 0);
__decorate([
    (0, mongoose_3.Prop)(),
    __metadata("design:type", String)
], AdminActionLog.prototype, "admin_name", void 0);
__decorate([
    (0, mongoose_3.Prop)(),
    __metadata("design:type", String)
], AdminActionLog.prototype, "target_type", void 0);
__decorate([
    (0, mongoose_3.Prop)(),
    __metadata("design:type", String)
], AdminActionLog.prototype, "target_id", void 0);
__decorate([
    (0, mongoose_3.Prop)(),
    __metadata("design:type", String)
], AdminActionLog.prototype, "reason", void 0);
__decorate([
    (0, mongoose_3.Prop)({ type: Object }),
    __metadata("design:type", Object)
], AdminActionLog.prototype, "before", void 0);
__decorate([
    (0, mongoose_3.Prop)({ type: Object }),
    __metadata("design:type", Object)
], AdminActionLog.prototype, "after", void 0);
exports.AdminActionLog = AdminActionLog = __decorate([
    (0, mongoose_3.Schema)({ timestamps: true, collection: 'admin_actions_log' })
], AdminActionLog);
exports.AdminActionLogSchema = mongoose_3.SchemaFactory.createForClass(AdminActionLog);
let AdminAuthorityService = class AdminAuthorityService {
    constructor(appts, orderModel, userModel, labs, rads, log, bus, jwtService) {
        this.appts = appts;
        this.orderModel = orderModel;
        this.userModel = userModel;
        this.labs = labs;
        this.rads = rads;
        this.log = log;
        this.bus = bus;
        this.jwtService = jwtService;
    }
    async logAction(admin, action, target_type, target_id, reason, before, after) {
        await this.log.create({ action, admin_id: admin.id, admin_name: admin.full_name, target_type, target_id, reason, before, after }).catch(() => null);
        this.bus.emit({ type: `admin.${action}`, entity_type: target_type, entity_id: target_id, actor_account_id: admin.id, actor_role: 'admin', reason_code: reason, before, after }).catch(() => null);
    }
    async forceCancelOrder(admin, id, reason) {
        const o = await this.orderModel.findOne({ id });
        if (!o)
            throw new common_1.NotFoundException();
        const before = { state: o.state };
        o.state_history.push({ from: o.state, to: enums_2.OrderState.CANCELLED, by_user_id: admin.id, by_role: 'admin', at: new Date(), note: 'admin_force: ' + reason });
        o.state = enums_2.OrderState.CANCELLED;
        await o.save();
        await this.logAction(admin, 'force_cancel_order', 'order', id, reason, before, { state: o.state });
        return o.toObject();
    }
    async forceCompleteOrder(admin, id, reason) {
        const o = await this.orderModel.findOne({ id });
        if (!o)
            throw new common_1.NotFoundException();
        const before = { state: o.state };
        o.state_history.push({ from: o.state, to: enums_2.OrderState.DELIVERED, by_user_id: admin.id, by_role: 'admin', at: new Date(), note: reason });
        o.state = enums_2.OrderState.DELIVERED;
        await o.save();
        await this.logAction(admin, 'force_complete_order', 'order', id, reason, before, { state: o.state });
        return o.toObject();
    }
    async forceReassignOrder(admin, id, new_pharmacy_id, reason) {
        const o = await this.orderModel.findOne({ id });
        if (!o)
            throw new common_1.NotFoundException();
        const before = { pharmacy_id: o.pharmacy_id, state: o.state };
        o.pharmacy_id = new_pharmacy_id;
        o.state = enums_2.OrderState.PHARMACY_RECEIVED;
        o.state_history.push({ from: before.state, to: enums_2.OrderState.PHARMACY_RECEIVED, by_user_id: admin.id, by_role: 'admin', at: new Date(), note: 'reassigned: ' + reason });
        await o.save();
        await this.logAction(admin, 'force_reassign_order', 'order', id, reason, before, { pharmacy_id: new_pharmacy_id });
        return o.toObject();
    }
    async forceCancelLab(admin, id, reason) {
        const b = await this.labs.findOne({ id });
        if (!b)
            throw new common_1.NotFoundException();
        const before = { state: b.state };
        b.state_history.push({ from: b.state, to: lab_schema_1.LabBookingState.CANCELLED, by_user_id: admin.id, by_role: 'admin', at: new Date(), note: reason });
        b.state = lab_schema_1.LabBookingState.CANCELLED;
        await b.save();
        await this.logAction(admin, 'force_cancel_lab', 'lab_booking', id, reason, before, { state: b.state });
        return b.toObject();
    }
    async forceCompleteLab(admin, id, reason) {
        const b = await this.labs.findOne({ id });
        if (!b)
            throw new common_1.NotFoundException();
        const before = { state: b.state };
        b.state_history.push({ from: b.state, to: lab_schema_1.LabBookingState.REPORTED, by_user_id: admin.id, by_role: 'admin', at: new Date(), note: reason });
        b.state = lab_schema_1.LabBookingState.REPORTED;
        await b.save();
        await this.logAction(admin, 'force_complete_lab', 'lab_booking', id, reason, before, { state: b.state });
        return b.toObject();
    }
    async overrideLabInsurance(admin, id, status, reason) {
        const b = await this.labs.findOne({ id });
        if (!b)
            throw new common_1.NotFoundException();
        const before = { insurance_status: b.insurance_status };
        b.insurance_status = status;
        if (status === 'rejected')
            b.rejection_reason = reason;
        await b.save();
        await this.logAction(admin, 'override_insurance_lab', 'lab_booking', id, reason, before, { insurance_status: status });
        return b.toObject();
    }
    async forceCancelRad(admin, id, reason) {
        const b = await this.rads.findOne({ id });
        if (!b)
            throw new common_1.NotFoundException();
        const before = { state: b.state };
        b.state_history.push({ from: b.state, to: radiology_schema_1.RadiologyBookingState.CANCELLED, by_user_id: admin.id, by_role: 'admin', at: new Date(), note: reason });
        b.state = radiology_schema_1.RadiologyBookingState.CANCELLED;
        await b.save();
        await this.logAction(admin, 'force_cancel_radiology', 'radiology_booking', id, reason, before, { state: b.state });
        return b.toObject();
    }
    async forceCompleteRad(admin, id, reason) {
        const b = await this.rads.findOne({ id });
        if (!b)
            throw new common_1.NotFoundException();
        const before = { state: b.state };
        b.state_history.push({ from: b.state, to: radiology_schema_1.RadiologyBookingState.REPORT_PUBLISHED, by_user_id: admin.id, by_role: 'admin', at: new Date(), note: reason });
        b.state = radiology_schema_1.RadiologyBookingState.REPORT_PUBLISHED;
        await b.save();
        await this.logAction(admin, 'force_complete_radiology', 'radiology_booking', id, reason, before, { state: b.state });
        return b.toObject();
    }
    async overrideRadInsurance(admin, id, status, reason) {
        const b = await this.rads.findOne({ id });
        if (!b)
            throw new common_1.NotFoundException();
        const before = { insurance_status: b.insurance_status };
        b.insurance_status = status;
        if (status === 'rejected')
            b.rejection_reason = reason;
        await b.save();
        await this.logAction(admin, 'override_insurance_radiology', 'radiology_booking', id, reason, before, { insurance_status: status });
        return b.toObject();
    }
    async forceCancelAppt(admin, id, reason) {
        const a = await this.appts.findOne({ id });
        if (!a)
            throw new common_1.NotFoundException();
        const before = { status: a.status };
        a.state_history = a.state_history || [];
        a.state_history.push({ from: a.status, to: 'CANCELLED', by_user_id: admin.id, by_role: 'admin', at: new Date(), note: reason });
        a.status = 'CANCELLED';
        await a.save();
        await this.logAction(admin, 'force_cancel_appointment', 'appointment', id, reason, before, { status: a.status });
        return a.toObject();
    }
    async forceConfirmAppt(admin, id, reason) {
        const a = await this.appts.findOne({ id });
        if (!a)
            throw new common_1.NotFoundException();
        const before = { status: a.status };
        a.state_history = a.state_history || [];
        a.state_history.push({ from: a.status, to: 'CONFIRMED', by_user_id: admin.id, by_role: 'admin', at: new Date(), note: reason });
        a.status = 'CONFIRMED';
        await a.save();
        await this.logAction(admin, 'force_confirm_appointment', 'appointment', id, reason, before, { status: a.status });
        return a.toObject();
    }
    async forceRescheduleAppt(admin, id, new_time, reason) {
        const a = await this.appts.findOne({ id });
        if (!a)
            throw new common_1.NotFoundException();
        const before = { status: a.status, slot_start: a.slot_start };
        a.state_history = a.state_history || [];
        a.state_history.push({ from: a.status, to: 'RESCHEDULED', by_user_id: admin.id, by_role: 'admin', at: new Date(), note: reason });
        a.status = 'RESCHEDULED';
        a.slot_start = new Date(new_time);
        a.slot_end = new Date(new Date(new_time).getTime() + 30 * 60000);
        await a.save();
        await this.logAction(admin, 'force_reschedule_appointment', 'appointment', id, reason, before, { status: a.status, slot_start: a.slot_start });
        return a.toObject();
    }
    async suspendProvider(admin, provider_id, reason) {
        const u = await this.userModel.findOne({ id: provider_id });
        if (!u)
            throw new common_1.NotFoundException();
        const before = { active: u.active };
        u.active = false;
        await u.save();
        await this.logAction(admin, 'suspend_provider', 'provider', provider_id, reason, before, { active: false });
        return { ok: true };
    }
    async unsuspendProvider(admin, provider_id) {
        const u = await this.userModel.findOne({ id: provider_id });
        if (!u)
            throw new common_1.NotFoundException();
        u.active = true;
        await u.save();
        await this.logAction(admin, 'unsuspend_provider', 'provider', provider_id);
        return { ok: true };
    }
    async impersonateUser(admin, targetUserId) {
        const targetUser = (await this.userModel.findOne({ id: targetUserId }).lean());
        if (!targetUser)
            throw new common_1.NotFoundException('Target user not found');
        const payload = {
            id: targetUser.id,
            email: targetUser.email,
            phone: targetUser.phone,
            role: targetUser.role,
            full_name: targetUser.full_name,
            permissions: targetUser.permissions || [],
            impersonator: {
                id: admin.id,
                email: admin.email,
                full_name: admin.full_name,
            }
        };
        const token = await this.jwtService.signAsync(payload);
        await this.logAction(admin, 'impersonate_user', 'user', targetUserId, 'Technical Support troubleshooting session started', null, { target_role: targetUser.role });
        return {
            access_token: token,
            user: {
                id: targetUser.id,
                email: targetUser.email,
                phone: targetUser.phone,
                role: targetUser.role,
                full_name: targetUser.full_name,
            }
        };
    }
    async listActions(filter) {
        const q = {};
        if (filter.action)
            q.action = filter.action;
        if (filter.admin_id)
            q.admin_id = filter.admin_id;
        if (filter.target_type)
            q.target_type = filter.target_type;
        return this.log.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(Math.min(filter.limit || 200, 500)).lean();
    }
};
exports.AdminAuthorityService = AdminAuthorityService;
exports.AdminAuthorityService = AdminAuthorityService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Appointment')),
    __param(1, (0, mongoose_1.InjectModel)('Order')),
    __param(2, (0, mongoose_1.InjectModel)('User')),
    __param(3, (0, mongoose_1.InjectModel)('LabBooking')),
    __param(4, (0, mongoose_1.InjectModel)('RadiologyBooking')),
    __param(5, (0, mongoose_1.InjectModel)('AdminActionLog')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        event_bus_service_1.EventBusService,
        jwt_1.JwtService])
], AdminAuthorityService);
let AdminAuthorityController = class AdminAuthorityController {
    constructor(svc) {
        this.svc = svc;
    }
    fca(id, b, u) { return this.svc.forceCancelAppt(u, id, b.reason || ''); }
    fcoappt(id, b, u) { return this.svc.forceConfirmAppt(u, id, b.reason || ''); }
    fra(id, b, u) { return this.svc.forceRescheduleAppt(u, id, b.new_time, b.reason || ''); }
    fco(id, b, u) { return this.svc.forceCancelOrder(u, id, b.reason || ''); }
    fkco(id, b, u) { return this.svc.forceCompleteOrder(u, id, b.reason || ''); }
    frr(id, b, u) { return this.svc.forceReassignOrder(u, id, b.pharmacy_id, b.reason || ''); }
    fcl(id, b, u) { return this.svc.forceCancelLab(u, id, b.reason || ''); }
    fkcl(id, b, u) { return this.svc.forceCompleteLab(u, id, b.reason || ''); }
    oil(id, b, u) { return this.svc.overrideLabInsurance(u, id, b.status, b.reason || ''); }
    fcr(id, b, u) { return this.svc.forceCancelRad(u, id, b.reason || ''); }
    fkcr(id, b, u) { return this.svc.forceCompleteRad(u, id, b.reason || ''); }
    oir(id, b, u) { return this.svc.overrideRadInsurance(u, id, b.status, b.reason || ''); }
    susp(id, b, u) { return this.svc.suspendProvider(u, id, b.reason || ''); }
    unsp(id, u) { return this.svc.unsuspendProvider(u, id); }
    impersonate(targetUserId, admin) { return this.svc.impersonateUser(admin, targetUserId); }
    log(q) { return this.svc.listActions({ action: q?.action, admin_id: q?.admin_id, target_type: q?.target_type, limit: q?.limit ? Number(q.limit) : undefined }); }
};
exports.AdminAuthorityController = AdminAuthorityController;
__decorate([
    (0, common_1.Post)('appointments/:id/force-cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminAuthorityController.prototype, "fca", null);
__decorate([
    (0, common_1.Post)('appointments/:id/force-confirm'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminAuthorityController.prototype, "fcoappt", null);
__decorate([
    (0, common_1.Post)('appointments/:id/force-reschedule'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminAuthorityController.prototype, "fra", null);
__decorate([
    (0, common_1.Post)('orders/:id/force-cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminAuthorityController.prototype, "fco", null);
__decorate([
    (0, common_1.Post)('orders/:id/force-complete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminAuthorityController.prototype, "fkco", null);
__decorate([
    (0, common_1.Post)('orders/:id/force-reassign'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminAuthorityController.prototype, "frr", null);
__decorate([
    (0, common_1.Post)('labs/:id/force-cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminAuthorityController.prototype, "fcl", null);
__decorate([
    (0, common_1.Post)('labs/:id/force-complete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminAuthorityController.prototype, "fkcl", null);
__decorate([
    (0, common_1.Post)('labs/:id/override-insurance'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminAuthorityController.prototype, "oil", null);
__decorate([
    (0, common_1.Post)('radiology/:id/force-cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminAuthorityController.prototype, "fcr", null);
__decorate([
    (0, common_1.Post)('radiology/:id/force-complete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminAuthorityController.prototype, "fkcr", null);
__decorate([
    (0, common_1.Post)('radiology/:id/override-insurance'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminAuthorityController.prototype, "oir", null);
__decorate([
    (0, common_1.Post)('providers/:id/suspend'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminAuthorityController.prototype, "susp", null);
__decorate([
    (0, common_1.Post)('providers/:id/unsuspend'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminAuthorityController.prototype, "unsp", null);
__decorate([
    (0, common_1.Post)('users/:id/impersonate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminAuthorityController.prototype, "impersonate", null);
__decorate([
    (0, common_1.Get)('actions'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminAuthorityController.prototype, "log", null);
exports.AdminAuthorityController = AdminAuthorityController = __decorate([
    (0, common_1.Controller)('admin/authority'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [AdminAuthorityService])
], AdminAuthorityController);
let AdminAuthorityModule = class AdminAuthorityModule {
};
exports.AdminAuthorityModule = AdminAuthorityModule;
exports.AdminAuthorityModule = AdminAuthorityModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([
                { name: 'Order', schema: order_schema_1.OrderSchema },
                { name: 'User', schema: user_schema_1.UserSchema },
                { name: 'LabBooking', schema: lab_schema_1.LabBookingSchema },
                { name: 'RadiologyBooking', schema: radiology_schema_1.RadiologyBookingSchema },
                { name: 'AdminActionLog', schema: exports.AdminActionLogSchema },
                { name: 'Appointment', schema: appointment_schema_1.AppointmentSchema },
            ])],
        controllers: [AdminAuthorityController],
        providers: [AdminAuthorityService],
        exports: [AdminAuthorityService],
    })
], AdminAuthorityModule);
//# sourceMappingURL=admin-authority.module.js.map