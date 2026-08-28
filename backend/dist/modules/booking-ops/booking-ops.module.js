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
exports.BookingOpsModule = exports.BookingOpsController = exports.BookingOpsService = exports.BookingAttachmentSchema = exports.BookingAttachment = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("@nestjs/mongoose");
const mongoose_3 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const common_2 = require("@nestjs/common");
const order_schema_1 = require("../../schemas/order.schema");
const lab_schema_1 = require("../../schemas/lab.schema");
const radiology_schema_1 = require("../../schemas/radiology.schema");
const home_care_schema_1 = require("../../schemas/home-care.schema");
const appointment_schema_1 = require("../../schemas/appointment.schema");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
let BookingAttachment = class BookingAttachment extends mongoose_3.Document {
};
exports.BookingAttachment = BookingAttachment;
__decorate([
    (0, mongoose_2.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], BookingAttachment.prototype, "booking_kind", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], BookingAttachment.prototype, "booking_id", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true }),
    __metadata("design:type", String)
], BookingAttachment.prototype, "by_user_id", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true }),
    __metadata("design:type", String)
], BookingAttachment.prototype, "name", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true }),
    __metadata("design:type", String)
], BookingAttachment.prototype, "mime", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true }),
    __metadata("design:type", String)
], BookingAttachment.prototype, "base64", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", String)
], BookingAttachment.prototype, "purpose", void 0);
exports.BookingAttachment = BookingAttachment = __decorate([
    (0, mongoose_2.Schema)({ collection: 'booking_attachments', timestamps: true })
], BookingAttachment);
exports.BookingAttachmentSchema = mongoose_2.SchemaFactory.createForClass(BookingAttachment);
let BookingOpsService = class BookingOpsService {
    constructor(orders, labs, rads, home, appts, providers, attachments) {
        this.orders = orders;
        this.labs = labs;
        this.rads = rads;
        this.home = home;
        this.appts = appts;
        this.providers = providers;
        this.attachments = attachments;
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
    async invoice(user, type, id) {
        const kind = this.kindAliases[type];
        if (!kind)
            throw new common_1.BadRequestException('invalid_type');
        const e = await this.fetchEntity(kind, id, user);
        if (!e)
            throw new common_1.NotFoundException();
        const subtotal = e.subtotal ?? e.total ?? e.price ?? 0;
        const taxRate = 0.15;
        const tax = Math.round(subtotal * taxRate * 100) / 100;
        const insuranceDiscount = e.insurance_provider ? Math.round(subtotal * 0.8 * 100) / 100 : 0;
        const total = e.total ?? Math.max(0, subtotal - insuranceDiscount) + tax;
        return {
            booking_id: id, kind, tracking_id: e.tracking_id || id,
            patient_id: e.patient_id, provider_id: e.pharmacy_id || e.provider_account_id || e.doctor_user_id,
            items: e.items || [{ name_ar: e.service_name_ar || 'خدمة', price: subtotal }],
            payment_method: e.payment_method || 'cash',
            insurance_provider: e.insurance_provider,
            breakdown: { subtotal, tax, insurance_discount: insuranceDiscount, delivery_fee: e.delivery_fee || 0, total },
            issued_at: e.createdAt,
            currency: 'SAR',
        };
    }
    async payment(user, type, id) {
        const kind = this.kindAliases[type];
        if (!kind)
            throw new common_1.BadRequestException('invalid_type');
        const e = await this.fetchEntity(kind, id, user);
        if (!e)
            throw new common_1.NotFoundException();
        const status = e.payment_status || (e.payment_method === 'cash' ? 'cash_on_delivery'
            : e.payment_method === 'insurance' ? (e.insurance_status === 'approved' ? 'covered' : 'awaiting_insurance')
                : 'pending');
        return {
            booking_id: id, kind, payment_method: e.payment_method || 'cash',
            payment_status: status, insurance_provider: e.insurance_provider,
            insurance_status: e.insurance_status, amount: e.total || e.price || 0,
            paid_at: e.paid_at || null, transaction_id: e.transaction_id || null,
        };
    }
    async markPayment(user, type, id, body) {
        if (!this.isAdmin(user) && !this.isProvider(user))
            throw new common_2.ForbiddenException('not_authorized');
        const kind = this.kindAliases[type];
        if (!kind)
            throw new common_1.BadRequestException('invalid_type');
        const entity = await this.fetchEntity(kind, id, user);
        if (!entity)
            throw new common_1.NotFoundException('booking_not_found');
        const Model = kind === 'pharmacy' ? this.orders
            : kind === 'lab' ? this.labs
                : kind === 'radiology' ? this.rads
                    : kind === 'nursing' ? this.home
                        : this.appts;
        const set = {};
        if (body.status) {
            set.payment_status = body.status;
            set.transaction_id = body.transaction_id || null;
            set.paid_at = body.status === 'paid' ? new Date() : null;
        }
        if (body.insurance_status) {
            set.insurance_status = body.insurance_status === 'verified' ? 'approved' : body.insurance_status;
        }
        if (!Object.keys(set).length)
            throw new common_1.BadRequestException('payment_update_required');
        const updated = await Model.updateOne({ id, ...(this.isAdmin(user) ? {} : { $or: this.providerOwnership(user) }) }, { $set: set });
        const matched = updated?.matchedCount ?? updated?.nMatched;
        if (matched === 0)
            throw new common_1.NotFoundException('booking_not_found');
        return { ok: true, ...set };
    }
    async addAttachment(user, type, id, body) {
        const kind = this.kindAliases[type];
        if (!kind)
            throw new common_1.BadRequestException('invalid_type');
        const e = await this.fetchEntity(kind, id, user);
        if (!e)
            throw new common_1.NotFoundException();
        return this.attachments.create({
            booking_kind: kind, booking_id: id, by_user_id: user.id,
            name: body.name, mime: body.mime, base64: body.base64, purpose: body.purpose || 'other',
        });
    }
    async listAttachments(user, type, id) {
        const kind = this.kindAliases[type];
        if (!kind)
            throw new common_1.BadRequestException('invalid_type');
        const e = await this.fetchEntity(kind, id, user);
        if (!e)
            throw new common_1.NotFoundException();
        return this.attachments.find({ booking_kind: kind, booking_id: id }, { base64: 0, _id: 0, __v: 0 }).sort({ createdAt: -1 }).lean();
    }
    async getAttachment(user, type, id, attachmentId) {
        const kind = this.kindAliases[type];
        if (!kind)
            throw new common_1.BadRequestException('invalid_type');
        const e = await this.fetchEntity(kind, id, user);
        if (!e)
            throw new common_1.NotFoundException();
        return this.attachments.findOne({ _id: attachmentId, booking_kind: kind, booking_id: id }, { __v: 0 }).lean();
    }
};
exports.BookingOpsService = BookingOpsService;
exports.BookingOpsService = BookingOpsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Order')),
    __param(1, (0, mongoose_1.InjectModel)('LabBooking')),
    __param(2, (0, mongoose_1.InjectModel)('RadiologyBooking')),
    __param(3, (0, mongoose_1.InjectModel)('HomeCareBooking')),
    __param(4, (0, mongoose_1.InjectModel)(appointment_schema_1.Appointment.name)),
    __param(5, (0, mongoose_1.InjectModel)('ProviderProfile')),
    __param(6, (0, mongoose_1.InjectModel)('BookingAttachment')),
    __metadata("design:paramtypes", [mongoose_3.Model,
        mongoose_3.Model,
        mongoose_3.Model,
        mongoose_3.Model,
        mongoose_3.Model,
        mongoose_3.Model,
        mongoose_3.Model])
], BookingOpsService);
let BookingOpsController = class BookingOpsController {
    constructor(svc) {
        this.svc = svc;
    }
    invoice(u, t, id) { return this.svc.invoice(u, t, id); }
    payment(u, t, id) { return this.svc.payment(u, t, id); }
    mark(u, t, id, b) { return this.svc.markPayment(u, t, id, b); }
    addAtt(u, t, id, b) { return this.svc.addAttachment(u, t, id, b); }
    listAtt(u, t, id) { return this.svc.listAttachments(u, t, id); }
};
exports.BookingOpsController = BookingOpsController;
__decorate([
    (0, common_1.Get)('invoice/:type/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], BookingOpsController.prototype, "invoice", null);
__decorate([
    (0, common_1.Get)('payment/:type/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], BookingOpsController.prototype, "payment", null);
__decorate([
    (0, common_1.Post)('payment/:type/:id/mark'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], BookingOpsController.prototype, "mark", null);
__decorate([
    (0, common_1.Post)('attachments/:type/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], BookingOpsController.prototype, "addAtt", null);
__decorate([
    (0, common_1.Get)('attachments/:type/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], BookingOpsController.prototype, "listAtt", null);
exports.BookingOpsController = BookingOpsController = __decorate([
    (0, common_1.Controller)('booking/flow'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [BookingOpsService])
], BookingOpsController);
let BookingOpsModule = class BookingOpsModule {
};
exports.BookingOpsModule = BookingOpsModule;
exports.BookingOpsModule = BookingOpsModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([
                { name: 'Order', schema: order_schema_1.OrderSchema },
                { name: 'LabBooking', schema: lab_schema_1.LabBookingSchema },
                { name: 'RadiologyBooking', schema: radiology_schema_1.RadiologyBookingSchema },
                { name: 'HomeCareBooking', schema: home_care_schema_1.HomeCareBookingSchema },
                { name: appointment_schema_1.Appointment.name, schema: appointment_schema_1.AppointmentSchema },
                { name: 'ProviderProfile', schema: provider_profile_schema_1.ProviderProfileSchema },
                { name: 'BookingAttachment', schema: exports.BookingAttachmentSchema },
            ])],
        controllers: [BookingOpsController],
        providers: [BookingOpsService],
        exports: [BookingOpsService],
    })
], BookingOpsModule);
//# sourceMappingURL=booking-ops.module.js.map