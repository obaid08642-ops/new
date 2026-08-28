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
exports.HomeCareTrackingController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../../common/auth.guard");
const medical_supply_request_schema_1 = require("../schemas/medical-supply-request.schema");
let HomeCareTrackingController = class HomeCareTrackingController {
    constructor(supplyModel, bookingModel, connection) {
        this.supplyModel = supplyModel;
        this.bookingModel = bookingModel;
        this.connection = connection;
    }
    isAdmin(user) {
        return user?.role === 'admin' || user?.role === 'super_admin';
    }
    async userDocumentId(user) {
        if (!user?.id)
            throw new common_1.ForbiddenException('authenticated user required');
        const account = await this.connection.model('User').findOne({ id: user.id }).select({ _id: 1 }).lean();
        if (!account?._id)
            throw new common_1.ForbiddenException('provider account not found');
        return account._id;
    }
    async assignedBooking(bookingId, user) {
        if (!bookingId)
            throw new common_1.BadRequestException('bookingId is required');
        const booking = await this.bookingModel.findOne({ id: bookingId });
        if (!booking)
            throw new common_1.NotFoundException('booking_not_found');
        if (this.isAdmin(user))
            return booking;
        const providerRoles = ['nurse', 'nursing', 'home_care', 'hospital'];
        if (!providerRoles.includes(String(user?.role || '').toLowerCase()) || booking.provider_id !== user.id) {
            throw new common_1.ForbiddenException('booking is not assigned to this provider');
        }
        return booking;
    }
    async verifyAttendance(bookingId, body, user) {
        const booking = await this.assignedBooking(bookingId, user);
        const { nurseLat, nurseLng } = body || {};
        if (!Number.isFinite(nurseLat) || !Number.isFinite(nurseLng)) {
            throw new common_1.BadRequestException('nurseLat and nurseLng are required');
        }
        const patientLat = booking.address?.lat;
        const patientLng = booking.address?.lng;
        if (!Number.isFinite(patientLat) || !Number.isFinite(patientLng)) {
            throw new common_1.BadRequestException({ code: 'PATIENT_LOCATION_UNAVAILABLE', message: 'لا يمكن التحقق من الحضور قبل توفر موقع المريض.' });
        }
        const earthRadiusKm = 6371;
        const dLat = (patientLat - nurseLat) * (Math.PI / 180);
        const dLng = (patientLng - nurseLng) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) ** 2
            + Math.cos(nurseLat * (Math.PI / 180)) * Math.cos(patientLat * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceMeters = earthRadiusKm * c * 1000;
        if (distanceMeters > 500) {
            throw new common_1.BadRequestException({
                code: 'GEOFENCE_VIOLATION_THRESHOLD',
                distance_calculated_meters: distanceMeters,
                message: 'فشل تسجيل الدخول. يجب أن تكون متواجدًا في موقع المريض الفعلي (أقل من 500 متر) لبدء الجلسة الطبية.',
            });
        }
        booking.gps_tracking = { ...(booking.gps_tracking || {}), current_lat: nurseLat, current_lng: nurseLng, last_updated: new Date() };
        booking.markModified('gps_tracking');
        await booking.save();
        return { success: true, distance_meters: distanceMeters, message: 'تم التحقق من الحضور الجغرافي بنجاح. الجلسة مفتوحة الآن.' };
    }
    async requestSupplies(dto, user) {
        const booking = await this.assignedBooking(String(dto?.bookingId || ''), user);
        const items = Array.isArray(dto?.items) ? dto.items : [];
        if (!items.length)
            throw new common_1.BadRequestException('items are required');
        const nurseObjectId = await this.userDocumentId(user);
        if (!mongoose_2.Types.ObjectId.isValid(String(booking._id)))
            throw new common_1.BadRequestException('booking reference is invalid');
        const request = await this.supplyModel.create({
            booking_id: booking._id,
            nurse_id: nurseObjectId,
            requested_items: items,
            priority: dto?.priority || 'NORMAL',
        });
        return { success: true, request_id: request._id, message: 'تم إرسال طلب المستلزمات الطبية وجاري تجهيزه للشحن فوراً.' };
    }
};
exports.HomeCareTrackingController = HomeCareTrackingController;
__decorate([
    (0, common_1.Post)('verify-attendance/:bookingId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('bookingId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], HomeCareTrackingController.prototype, "verifyAttendance", null);
__decorate([
    (0, common_1.Post)('submit-supplies-request'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], HomeCareTrackingController.prototype, "requestSupplies", null);
exports.HomeCareTrackingController = HomeCareTrackingController = __decorate([
    (0, common_1.Controller)('home-care/tracking'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, mongoose_1.InjectModel)(medical_supply_request_schema_1.MedicalSupplyRequest.name)),
    __param(1, (0, mongoose_1.InjectModel)('HomeCareBooking')),
    __param(2, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Connection])
], HomeCareTrackingController);
//# sourceMappingURL=home-care-tracking.controller.js.map