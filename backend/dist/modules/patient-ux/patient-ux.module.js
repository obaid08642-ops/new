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
exports.PatientUxModule = exports.AdminOverrideController = exports.AdminOverrideService = exports.AdminRefundsController = exports.PatientUxController = exports.PatientUxService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
const review_schema_1 = require("../../schemas/review.schema");
const refund_request_schema_1 = require("../../schemas/refund-request.schema");
const order_schema_1 = require("../../schemas/order.schema");
const lab_schema_1 = require("../../schemas/lab.schema");
const radiology_schema_1 = require("../../schemas/radiology.schema");
const home_care_schema_1 = require("../../schemas/home-care.schema");
const appointment_schema_1 = require("../../schemas/appointment.schema");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const events_module_1 = require("../events/events.module");
const event_bus_service_1 = require("../events/event-bus.service");
let PatientUxService = class PatientUxService {
    constructor(reviews, refunds, orders, labs, rads, home, appts, events, bus) {
        this.reviews = reviews;
        this.refunds = refunds;
        this.orders = orders;
        this.labs = labs;
        this.rads = rads;
        this.home = home;
        this.appts = appts;
        this.events = events;
        this.bus = bus;
    }
    model(k) {
        return k === 'pharmacy' ? this.orders : k === 'lab' ? this.labs : k === 'radiology' ? this.rads : k === 'nursing' ? this.home : this.appts;
    }
    async rate(user, body) {
        if (!body.rating || body.rating < 1 || body.rating > 5)
            throw new common_1.BadRequestException('invalid_rating');
        const M = this.model(body.booking_kind);
        const b = await M.findOne({ id: body.booking_id }).lean();
        if (!b)
            throw new common_1.NotFoundException();
        if (b.patient_id !== user.id)
            throw new common_1.BadRequestException('not_owner');
        const stateStr = (b.state || b.status || '').toUpperCase();
        if (body.booking_kind === 'pharmacy') {
            if (stateStr !== 'DELIVERED')
                throw new common_1.ForbiddenException('You can only rate after order is DELIVERED');
        }
        else if (body.booking_kind === 'lab') {
            if (stateStr !== 'REPORTED' && stateStr !== 'RESULT_READY')
                throw new common_1.ForbiddenException('You can only rate after lab result is ready/reported');
        }
        else if (body.booking_kind === 'radiology') {
            if (stateStr !== 'COMPLETED' && stateStr !== 'REPORT_PUBLISHED')
                throw new common_1.ForbiddenException('You can only rate after radiology report is published');
        }
        else if (body.booking_kind === 'nursing') {
            if (stateStr !== 'COMPLETED')
                throw new common_1.ForbiddenException('You can only rate after home service is COMPLETED');
        }
        else {
            if (stateStr !== 'COMPLETED')
                throw new common_1.ForbiddenException('You can only rate after appointment is COMPLETED');
        }
        const provider_id = b.provider_id || b.assigned_provider_id || b.doctor_id;
        if (!provider_id)
            throw new common_1.BadRequestException('no_provider');
        const status = body.rating < 3 ? 'pending_review' : 'approved';
        return this.reviews.findOneAndUpdate({ booking_kind: body.booking_kind, booking_id: body.booking_id }, { $set: { provider_id, patient_id: user.id, booking_kind: body.booking_kind, booking_id: body.booking_id, rating: body.rating, comment: body.comment, aspects: body.aspects, status } }, { upsert: true, new: true });
    }
    async requestRefund(user, body) {
        if (!body.reason)
            throw new common_1.BadRequestException('reason_required');
        const M = this.model(body.booking_kind);
        const b = await M.findOne({ id: body.booking_id }).lean();
        if (!b || b.patient_id !== user.id)
            throw new common_1.BadRequestException('not_owner');
        if (!['paid', 'partially_refunded'].includes(b.payment_status))
            throw new common_1.BadRequestException('not_eligible_for_refund');
        const existing = await this.refunds.findOne({ booking_id: body.booking_id, status: 'requested' });
        if (existing)
            return existing.toObject();
        const rr = await this.refunds.create({ booking_kind: body.booking_kind, booking_id: body.booking_id, patient_id: user.id, reason: body.reason, amount: body.amount });
        this.events.emit('refund.requested', rr.toObject());
        return rr.toObject();
    }
    async myRefunds(user) {
        return this.refunds.find({ patient_id: user.id }).sort({ createdAt: -1 }).lean();
    }
    async adminListRefunds(status) {
        const filter = {};
        if (status)
            filter.status = status;
        return this.refunds.find(filter).sort({ createdAt: -1 }).limit(500).lean();
    }
    async adminDecideRefund(admin, id, decision, note, amount) {
        const r = await this.refunds.findOne({ id });
        if (!r)
            throw new common_1.NotFoundException('refund_not_found');
        if (r.status !== 'requested')
            throw new common_1.BadRequestException('not_pending');
        r.status = decision;
        r.decided_at = new Date();
        r.decided_by = admin.id;
        if (note)
            r.admin_note = note;
        if (decision === 'approved' && amount)
            r.amount = amount;
        await r.save();
        if (decision === 'approved') {
            try {
                const M = this.model(r.booking_kind);
                await M.updateOne({ id: r.booking_id }, { $set: { payment_status: 'refunded', refunded_at: new Date(), refund_amount: r.amount } });
            }
            catch { }
        }
        this.bus.emit({
            type: `refund.${decision}`,
            entity_type: 'refund_request',
            entity_id: r.id,
            actor_account_id: admin.id,
            actor_role: 'admin',
            patient_account_id: r.patient_id,
            reason_code: r.reason,
            meta: { booking_kind: r.booking_kind, booking_id: r.booking_id, amount: r.amount, note },
        }).catch(() => null);
        this.events.emit('refund.decided', { id, decision });
        return r.toObject();
    }
    async rebook(user, body) {
        const M = this.model(body.booking_kind);
        const prev = await M.findOne({ id: body.booking_id, patient_id: user.id }).lean();
        if (!prev)
            throw new common_1.NotFoundException();
        const clone = JSON.parse(JSON.stringify(prev));
        delete clone._id;
        delete clone.id;
        delete clone.createdAt;
        delete clone.updatedAt;
        delete clone.state;
        delete clone.status;
        delete clone.assignment;
        delete clone.payment_status;
        delete clone.paid_at;
        delete clone.transaction_id;
        clone.scheduled_at = body.scheduled_at ? new Date(body.scheduled_at) : new Date();
        clone.state = 'created';
        clone.status = 'pending';
        const created = await M.create(clone);
        this.events.emit('booking.rebooked', { kind: body.booking_kind, original_id: body.booking_id, new_id: created.id });
        return { kind: body.booking_kind, id: created.id };
    }
};
exports.PatientUxService = PatientUxService;
exports.PatientUxService = PatientUxService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Review')),
    __param(1, (0, mongoose_1.InjectModel)('PatientUxRefund')),
    __param(2, (0, mongoose_1.InjectModel)('Order')),
    __param(3, (0, mongoose_1.InjectModel)('LabBooking')),
    __param(4, (0, mongoose_1.InjectModel)('RadiologyBooking')),
    __param(5, (0, mongoose_1.InjectModel)('HomeCareBooking')),
    __param(6, (0, mongoose_1.InjectModel)(appointment_schema_1.Appointment.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        event_emitter_1.EventEmitter2,
        event_bus_service_1.EventBusService])
], PatientUxService);
let PatientUxController = class PatientUxController {
    constructor(svc) {
        this.svc = svc;
    }
    rate(u, b) { return this.svc.rate(u, b); }
    refund(u, b) { return this.svc.requestRefund(u, b); }
    refunds(u) { return this.svc.myRefunds(u); }
    rebook(u, b) { return this.svc.rebook(u, b); }
};
exports.PatientUxController = PatientUxController;
__decorate([
    (0, common_1.Post)('review'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PatientUxController.prototype, "rate", null);
__decorate([
    (0, common_1.Post)('refund'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PatientUxController.prototype, "refund", null);
__decorate([
    (0, common_1.Get)('refund/mine'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PatientUxController.prototype, "refunds", null);
__decorate([
    (0, common_1.Post)('rebook'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PatientUxController.prototype, "rebook", null);
exports.PatientUxController = PatientUxController = __decorate([
    (0, common_1.Controller)('patient-ux'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [PatientUxService])
], PatientUxController);
let AdminRefundsController = class AdminRefundsController {
    constructor(svc) {
        this.svc = svc;
    }
    list() { return this.svc.adminListRefunds(); }
    pending() { return this.svc.adminListRefunds('requested'); }
    decide(u, id, body) {
        return this.svc.adminDecideRefund(u, id, body.decision, body.note, body.amount);
    }
};
exports.AdminRefundsController = AdminRefundsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminRefundsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminRefundsController.prototype, "pending", null);
__decorate([
    (0, common_1.Post)(':id/decide'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminRefundsController.prototype, "decide", null);
exports.AdminRefundsController = AdminRefundsController = __decorate([
    (0, common_1.Controller)('admin/refunds'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [PatientUxService])
], AdminRefundsController);
let AdminOverrideService = class AdminOverrideService {
    constructor(orders, labs, rads, home, appts, bus) {
        this.orders = orders;
        this.labs = labs;
        this.rads = rads;
        this.home = home;
        this.appts = appts;
        this.bus = bus;
    }
    modelFor(kind) {
        switch (kind) {
            case 'pharmacy': return this.orders;
            case 'lab': return this.labs;
            case 'radiology': return this.rads;
            case 'nursing':
            case 'home_care': return this.home;
            case 'care':
            case 'consultation': return this.appts;
            default: return null;
        }
    }
    async forceCancel(admin, kind, id, reason) {
        const M = this.modelFor(kind);
        if (!M)
            throw new common_1.BadRequestException('invalid_kind');
        const doc = await M.findOne({ id });
        if (!doc)
            throw new common_1.NotFoundException('not_found');
        const before = { state: doc.state, status: doc.status, payment_status: doc.payment_status };
        doc.state = 'CANCELLED';
        doc.status = 'cancelled';
        doc.cancelled_at = new Date();
        doc.cancel_reason = `admin_override: ${reason}`;
        doc.admin_override_at = new Date();
        doc.admin_override_by = admin.id;
        await doc.save();
        this.bus.emit({
            type: 'admin.override.cancel',
            entity_type: kind === 'pharmacy' ? 'order' : 'booking',
            entity_id: id,
            actor_account_id: admin.id,
            actor_role: 'admin',
            reason_code: reason,
            patient_account_id: doc.patient_id,
            before,
            after: { state: 'CANCELLED', status: 'cancelled' },
            meta: { kind, reason },
        }).catch(() => null);
        return doc.toObject();
    }
    async forceTransition(admin, kind, id, state, reason) {
        const M = this.modelFor(kind);
        if (!M)
            throw new common_1.BadRequestException('invalid_kind');
        const doc = await M.findOne({ id });
        if (!doc)
            throw new common_1.NotFoundException('not_found');
        const before = { state: doc.state, status: doc.status };
        doc.state = state;
        doc.status = state.toLowerCase();
        doc.admin_override_at = new Date();
        doc.admin_override_by = admin.id;
        await doc.save();
        this.bus.emit({
            type: 'admin.override.transition',
            entity_type: kind === 'pharmacy' ? 'order' : 'booking',
            entity_id: id,
            actor_account_id: admin.id,
            actor_role: 'admin',
            reason_code: reason,
            patient_account_id: doc.patient_id,
            before,
            after: { state, status: state.toLowerCase() },
            meta: { kind, target_state: state, reason },
        }).catch(() => null);
        return doc.toObject();
    }
    async markPayment(admin, kind, id, payment_status, reason, amount) {
        const M = this.modelFor(kind);
        if (!M)
            throw new common_1.BadRequestException('invalid_kind');
        const doc = await M.findOne({ id });
        if (!doc)
            throw new common_1.NotFoundException('not_found');
        const before = { payment_status: doc.payment_status, amount: doc.amount_total };
        doc.payment_status = payment_status;
        if (payment_status === 'refunded') {
            doc.refunded_at = new Date();
            if (amount)
                doc.refund_amount = amount;
        }
        if (payment_status === 'paid')
            doc.paid_at = new Date();
        doc.admin_override_at = new Date();
        doc.admin_override_by = admin.id;
        await doc.save();
        this.bus.emit({
            type: `admin.override.payment_${payment_status}`,
            entity_type: 'payment',
            entity_id: id,
            actor_account_id: admin.id,
            actor_role: 'admin',
            reason_code: reason,
            patient_account_id: doc.patient_id,
            before,
            after: { payment_status, amount },
            meta: { kind, amount, reason },
        }).catch(() => null);
        return doc.toObject();
    }
};
exports.AdminOverrideService = AdminOverrideService;
exports.AdminOverrideService = AdminOverrideService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Order')),
    __param(1, (0, mongoose_1.InjectModel)('LabBooking')),
    __param(2, (0, mongoose_1.InjectModel)('RadiologyBooking')),
    __param(3, (0, mongoose_1.InjectModel)('HomeCareBooking')),
    __param(4, (0, mongoose_1.InjectModel)(appointment_schema_1.Appointment.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        event_bus_service_1.EventBusService])
], AdminOverrideService);
let AdminOverrideController = class AdminOverrideController {
    constructor(svc) {
        this.svc = svc;
    }
    cancel(u, body) {
        if (!body?.reason)
            throw new common_1.BadRequestException('reason_required');
        return this.svc.forceCancel(u, body.kind, body.id, body.reason);
    }
    transition(u, body) {
        if (!body?.reason || !body?.state)
            throw new common_1.BadRequestException('reason_and_state_required');
        return this.svc.forceTransition(u, body.kind, body.id, body.state, body.reason);
    }
    markPayment(u, body) {
        if (!body?.reason || !body?.payment_status)
            throw new common_1.BadRequestException('reason_and_status_required');
        return this.svc.markPayment(u, body.kind, body.id, body.payment_status, body.reason, body.amount);
    }
};
exports.AdminOverrideController = AdminOverrideController;
__decorate([
    (0, common_1.Post)('cancel'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminOverrideController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)('transition'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminOverrideController.prototype, "transition", null);
__decorate([
    (0, common_1.Post)('payment'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminOverrideController.prototype, "markPayment", null);
exports.AdminOverrideController = AdminOverrideController = __decorate([
    (0, common_1.Controller)('admin/override'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [AdminOverrideService])
], AdminOverrideController);
let PatientUxModule = class PatientUxModule {
};
exports.PatientUxModule = PatientUxModule;
exports.PatientUxModule = PatientUxModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([
                { name: 'Review', schema: review_schema_1.ReviewSchema },
                { name: 'PatientUxRefund', schema: refund_request_schema_1.RefundRequestSchema, collection: 'refundrequests' },
                { name: 'Order', schema: order_schema_1.OrderSchema },
                { name: 'LabBooking', schema: lab_schema_1.LabBookingSchema },
                { name: 'RadiologyBooking', schema: radiology_schema_1.RadiologyBookingSchema },
                { name: 'HomeCareBooking', schema: home_care_schema_1.HomeCareBookingSchema },
                { name: appointment_schema_1.Appointment.name, schema: appointment_schema_1.AppointmentSchema },
            ]), events_module_1.EventsModule],
        controllers: [PatientUxController, AdminRefundsController, AdminOverrideController],
        providers: [PatientUxService, AdminOverrideService],
        exports: [PatientUxService],
    })
], PatientUxModule);
//# sourceMappingURL=patient-ux.module.js.map