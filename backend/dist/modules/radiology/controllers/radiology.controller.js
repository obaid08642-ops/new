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
exports.RadiologyController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const auth_guard_1 = require("../../../common/auth.guard");
let RadiologyController = class RadiologyController {
    constructor(radBookingModel, radServiceModel, userModel) {
        this.radBookingModel = radBookingModel;
        this.radServiceModel = radServiceModel;
        this.userModel = userModel;
    }
    async book(user, body) {
        if (!body?.scheduled_at)
            throw new common_1.BadRequestException('scheduled_at is required');
        const patient = await this.userModel.findOne({ id: user.id }).lean();
        if (!patient)
            throw new common_1.BadRequestException('patient_not_found');
        let scan = {};
        if (body.service_id) {
            const svc = await this.radServiceModel.findOne({ id: body.service_id, is_deleted: { $ne: true } }).lean();
            if (!svc)
                throw new common_1.BadRequestException('service_not_found');
            scan = { scan_type_code: svc.id, scan_name_ar: svc.name_ar, scan_name_en: svc.name_en };
        }
        const scan_type_code = body.scan_type_code || scan.scan_type_code;
        const scan_name_ar = body.scan_name_ar || scan.scan_name_ar;
        const scan_name_en = body.scan_name_en || scan.scan_name_en;
        if (!scan_type_code || !scan_name_ar || !scan_name_en) {
            throw new common_1.BadRequestException('scan details required (pass service_id or scan_type_code + names)');
        }
        let centerId = null;
        if (body.provider_account_id) {
            const center = await this.userModel.findOne({ id: body.provider_account_id }).lean();
            if (center)
                centerId = center._id;
        }
        const booking = await this.radBookingModel.create({
            id: (0, uuid_1.v4)(),
            patient_id: patient._id,
            radiology_center_id: centerId,
            delivery_mode: body.delivery_mode === 'MOBILE_HOME_VISIT' ? 'MOBILE_HOME_VISIT' : 'IN_CENTER',
            referring_doctor_id: body.referring_doctor_id || null,
            scan_type_code,
            scan_name_ar,
            scan_name_en,
            status: 'PENDING_ACCEPTANCE',
        });
        return { id: booking.id, status: booking.status, message: 'تم إرسال طلب الأشعة بنجاح' };
    }
    async mine(user) {
        const patient = await this.userModel.findOne({ id: user.id }).lean();
        if (!patient)
            return [];
        return this.radBookingModel.find({ patient_id: patient._id }).sort({ createdAt: -1 }).limit(80).lean();
    }
    async getOne(bookingId, user) {
        const q = mongoose_2.Types.ObjectId.isValid(bookingId) ? { _id: bookingId } : { id: bookingId };
        const booking = await this.radBookingModel.findOne(q).lean();
        if (!booking)
            throw new common_1.NotFoundException('booking_not_found');
        const me = await this.userModel.findOne({ id: user.id }).lean();
        const mine = me && (String(booking.patient_id) === String(me._id) || String(booking.radiology_center_id) === String(me._id));
        if (!mine && user.role !== 'admin' && user.role !== 'super_admin')
            throw new common_1.NotFoundException('booking_not_found');
        return booking;
    }
    async allocateMachine(bookingId, body) {
        const { machineId } = body;
        const conflict = await this.radBookingModel.findOne({
            allocated_machine_id: machineId,
            status: { $in: ['ACCEPTED', 'CHECKED_IN'] }
        });
        if (conflict && conflict._id.toString() !== bookingId) {
            throw new common_1.BadRequestException({
                code: 'MACHINE_CONFLICT_RESERVED',
                message: 'الجهاز المحدد محجوز حالياً ومخصص لعملية فحص أخرى في نفس هذا الوقت.'
            });
        }
        const booking = await this.radBookingModel.findByIdAndUpdate(bookingId, { $set: { allocated_machine_id: machineId, status: 'ACCEPTED' } }, { new: true });
        return { success: true, data: booking, message: 'تم تخصيص وحجز جهاز الفحص بنجاح للطلب.' };
    }
    async finalizeScan(bookingId, body) {
        const { reportText, files, pdfUrl } = body;
        const booking = await this.radBookingModel.findByIdAndUpdate(bookingId, {
            $set: {
                clinical_impression_report: reportText,
                scanned_files_s3_urls: files || [],
                signed_report_pdf_url: pdfUrl,
                status: 'REPORT_UPLOADED'
            }
        }, { new: true });
        if (!booking)
            throw new common_1.BadRequestException('Radiology booking ID not found.');
        return {
            success: true,
            parent_appointment_id: booking.parent_appointment_id,
            message: 'تم حفظ تقرير الأشعة والصور الطبية بنجاح، وتفعيل إشعار العودة الآلي للطبيب المعالج.'
        };
    }
};
exports.RadiologyController = RadiologyController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RadiologyController.prototype, "book", null);
__decorate([
    (0, common_1.Get)('mine'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RadiologyController.prototype, "mine", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RadiologyController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)('allocate-machine/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RadiologyController.prototype, "allocateMachine", null);
__decorate([
    (0, common_1.Post)('finalize-scan/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RadiologyController.prototype, "finalizeScan", null);
exports.RadiologyController = RadiologyController = __decorate([
    (0, common_1.Controller)('radiology/bookings'),
    __param(0, (0, mongoose_1.InjectModel)('RadiologyCenterBooking')),
    __param(1, (0, mongoose_1.InjectModel)('RadiologyService')),
    __param(2, (0, mongoose_1.InjectModel)('User')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], RadiologyController);
//# sourceMappingURL=radiology.controller.js.map