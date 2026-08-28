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
exports.LabsEngineController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let LabsEngineController = class LabsEngineController {
    constructor(labBookingModel, labCatalogModel) {
        this.labBookingModel = labBookingModel;
        this.labCatalogModel = labCatalogModel;
    }
    async getQueue(labId) {
        if (!labId)
            throw new common_1.BadRequestException('lab_id is required');
        return this.labBookingModel.find({
            lab_id: labId,
            status: { $in: ['PENDING_ACCEPTANCE', 'ACCEPTED', 'SAMPLE_COLLECTED'] }
        }).sort({ createdAt: -1 });
    }
    async respondToBooking(bookingId, body) {
        const { accept, lab_id } = body;
        const newStatus = accept ? 'ACCEPTED' : 'CANCELLED';
        const booking = await this.labBookingModel.findOneAndUpdate({ _id: bookingId, lab_id }, { $set: { status: newStatus } }, { new: true });
        if (!booking)
            throw new common_1.BadRequestException('Lab booking ID not found or unauthorized.');
        return { success: true, data: booking, message: accept ? 'تم القبول' : 'تم الرفض' };
    }
    async collectSample(bookingId, body) {
        const { barcodeToken } = body;
        const duplicateCheck = await this.labBookingModel.findOne({ sample_barcode_token: barcodeToken });
        if (duplicateCheck && duplicateCheck._id.toString() !== bookingId) {
            throw new common_1.BadRequestException({
                code: 'DUPLICATE_BARCODE_TOKEN',
                message: 'رمز الباركود هذا مخصص ومسجل مسبقاً لعينة أخرى، يرجى استخدام أنبوب جديد بباركود فريد.'
            });
        }
        const booking = await this.labBookingModel.findByIdAndUpdate(bookingId, { $set: { sample_barcode_token: barcodeToken, status: 'SAMPLE_COLLECTED' } }, { new: true });
        if (!booking)
            throw new common_1.BadRequestException('Lab booking ID not found.');
        return { success: true, data: booking, message: 'تم ربط الباركود بالعينة الطبية بنجاح وتحويل الحالة إلى قيد المعالجة المخبرية.' };
    }
    async finalizeTest(bookingId, body) {
        const { metricResults, pdfUrl } = body;
        const booking = await this.labBookingModel.findByIdAndUpdate(bookingId, {
            $set: {
                entered_metric_results: metricResults || [],
                signed_report_pdf_url: pdfUrl,
                status: 'REPORT_UPLOADED'
            }
        }, { new: true });
        if (!booking)
            throw new common_1.BadRequestException('Lab booking ID not found.');
        return {
            success: true,
            parent_appointment_id: booking.parent_appointment_id,
            message: 'تم حفظ النتائج الرقمية والتقرير المخبري بنجاح، وتفعيل إشعار العودة الآلي للطبيب المعالج.'
        };
    }
    async getCatalog(labId) {
        if (!labId)
            throw new common_1.BadRequestException('lab_id is required');
        return this.labCatalogModel.find({ lab_id: labId });
    }
    async updateCatalog(body) {
        const { lab_id, test_code, ...updateData } = body;
        if (!lab_id || !test_code)
            throw new common_1.BadRequestException('lab_id and test_code are required');
        const catalogEntry = await this.labCatalogModel.findOneAndUpdate({ lab_id, test_code }, { $set: updateData }, { new: true, upsert: true });
        return { success: true, data: catalogEntry };
    }
    async getWallet(labId) {
        if (!labId)
            throw new common_1.BadRequestException('lab_id is required');
        const completedBookings = await this.labBookingModel.find({
            lab_id: labId,
            status: { $in: ['REPORT_UPLOADED'] }
        });
        let grossRevenue = 0;
        let insuranceClaims = 0;
        const transactions = [];
        completedBookings.forEach((b) => {
            if (b.payment_method === 'insurance') {
                insuranceClaims += b.total_price || 0;
                transactions.push({ id: b.id || b._id, date: b.updatedAt, amount: b.total_price || 0, type: 'INSURANCE_CLAIM_APPROVED', title: 'مطالبة تأمين معتمدة - ' + b.test_name_ar });
            }
            else {
                grossRevenue += b.total_price || 0;
                transactions.push({ id: b.id || b._id, date: b.updatedAt, amount: b.total_price || 0, type: 'CASH_TEST', title: 'دفع نقدي - ' + b.test_name_ar });
            }
        });
        const platformCommissions = (grossRevenue + insuranceClaims) * 0.15;
        const netPayout = (grossRevenue + insuranceClaims) - platformCommissions;
        return {
            success: true,
            data: {
                grossRevenue: grossRevenue + insuranceClaims,
                insuranceClaims,
                platformCommissions,
                netPayout,
                transactions
            }
        };
    }
};
exports.LabsEngineController = LabsEngineController;
__decorate([
    (0, common_1.Get)('queue'),
    __param(0, (0, common_1.Query)('lab_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LabsEngineController.prototype, "getQueue", null);
__decorate([
    (0, common_1.Post)(':id/respond'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LabsEngineController.prototype, "respondToBooking", null);
__decorate([
    (0, common_1.Post)('collect-sample/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LabsEngineController.prototype, "collectSample", null);
__decorate([
    (0, common_1.Post)('finalize-test/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LabsEngineController.prototype, "finalizeTest", null);
__decorate([
    (0, common_1.Get)('catalog'),
    __param(0, (0, common_1.Query)('lab_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LabsEngineController.prototype, "getCatalog", null);
__decorate([
    (0, common_1.Post)('catalog'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LabsEngineController.prototype, "updateCatalog", null);
__decorate([
    (0, common_1.Get)('wallet'),
    __param(0, (0, common_1.Query)('lab_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LabsEngineController.prototype, "getWallet", null);
exports.LabsEngineController = LabsEngineController = __decorate([
    (0, common_1.Controller)('labs/bookings'),
    __param(0, (0, mongoose_1.InjectModel)('LabCenterBooking')),
    __param(1, (0, mongoose_1.InjectModel)('LabCatalog')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], LabsEngineController);
//# sourceMappingURL=labs-engine.controller.js.map