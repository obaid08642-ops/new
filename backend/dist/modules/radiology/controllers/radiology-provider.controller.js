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
exports.RadiologyProviderController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../../common/auth.guard");
const enums_1 = require("../../../common/enums");
function bookingQuery(bookingId) {
    return mongoose_2.Types.ObjectId.isValid(bookingId) ? { _id: bookingId } : { id: bookingId };
}
let RadiologyProviderController = class RadiologyProviderController {
    constructor(radBookingModel, radServiceModel, radMachineModel, userModel) {
        this.radBookingModel = radBookingModel;
        this.radServiceModel = radServiceModel;
        this.radMachineModel = radMachineModel;
        this.userModel = userModel;
    }
    async centerFor(user) {
        return this.userModel.findOne({ id: user?.id }).lean();
    }
    isAdmin(user) {
        return user?.role === enums_1.UserRole.ADMIN || user?.role === enums_1.UserRole.SUPER_ADMIN;
    }
    async assertBookingAccess(booking, user, allowPending = false) {
        if (!booking)
            throw new common_1.BadRequestException('Booking not found');
        if (this.isAdmin(user))
            return null;
        const center = await this.centerFor(user);
        if (!center)
            throw new common_1.ForbiddenException('Radiology provider account not found');
        const assigned = booking.radiology_center_id && String(booking.radiology_center_id) === String(center._id);
        if (!assigned && !(allowPending && booking.status === 'PENDING_ACCEPTANCE')) {
            throw new common_1.ForbiddenException('Booking is not assigned to this radiology center');
        }
        return center;
    }
    async getProviderQueue(_providerId, user) {
        if (this.isAdmin(user)) {
            return this.radBookingModel.find({
                status: { $in: ['PENDING_ACCEPTANCE', 'ACCEPTED', 'CHECKED_IN', 'SCANNING_COMPLETED'] },
            }).sort({ createdAt: -1 }).lean();
        }
        const center = await this.centerFor(user);
        if (!center)
            throw new common_1.ForbiddenException('Radiology provider account not found');
        return this.radBookingModel.find({
            $or: [
                { status: 'PENDING_ACCEPTANCE' },
                { radiology_center_id: center._id, status: { $in: ['ACCEPTED', 'CHECKED_IN', 'SCANNING_COMPLETED'] } },
            ],
        }).sort({ createdAt: -1 }).lean();
    }
    async respondBooking(bookingId, body, user) {
        const booking = await this.radBookingModel.findOne(bookingQuery(bookingId));
        await this.assertBookingAccess(booking, user, true);
        if (typeof body?.accept !== 'boolean')
            throw new common_1.BadRequestException('accept (boolean) is required');
        if (body.accept) {
            if (this.isAdmin(user))
                throw new common_1.ForbiddenException('Admin must not claim a provider booking');
            const center = await this.centerFor(user);
            if (!center)
                throw new common_1.ForbiddenException('Radiology provider account not found');
            booking.status = 'ACCEPTED';
            booking.radiology_center_id = center._id;
        }
        else {
            booking.status = 'CANCELLED';
            booking.rejection_reason = 'Rejected by Radiology Center';
        }
        await booking.save();
        return { success: true, status: booking.status };
    }
    async allocateMachine(bookingId, body, user) {
        const { machineId } = body || {};
        if (!machineId)
            throw new common_1.BadRequestException('machineId is required');
        const booking = await this.radBookingModel.findOne(bookingQuery(bookingId));
        await this.assertBookingAccess(booking, user);
        const conflict = await this.radBookingModel.findOne({
            allocated_machine_id: machineId,
            status: { $in: ['ACCEPTED', 'CHECKED_IN', 'SCANNING_COMPLETED'] },
        });
        if (conflict && String(conflict.id) !== String(bookingId)) {
            throw new common_1.BadRequestException({
                code: 'MACHINE_CONFLICT_RESERVED',
                message: 'هذا الجهاز محجوز حالياً لهذه الفترة الزمنية.',
            });
        }
        const updatedBooking = await this.radBookingModel.findOneAndUpdate(bookingQuery(bookingId), { $set: { allocated_machine_id: machineId, status: 'CHECKED_IN' } }, { new: true });
        if (!updatedBooking)
            throw new common_1.BadRequestException('Booking not found');
        return { success: true, data: updatedBooking, message: 'تم تخصيص وحجز جهاز الفحص بنجاح للطلب.' };
    }
    async finalizeScan(bookingId, body, user) {
        const existing = await this.radBookingModel.findOne(bookingQuery(bookingId));
        await this.assertBookingAccess(existing, user);
        const { reportText, files, pdfUrl } = body || {};
        if (!reportText || !pdfUrl)
            throw new common_1.BadRequestException('reportText and pdfUrl are required');
        throw new common_1.BadRequestException('legacy_raw_report_upload_disabled_use_secure_storage_flow');
        const booking = await this.radBookingModel.findOneAndUpdate(bookingQuery(bookingId), {
            $set: {
                clinical_impression_report: reportText,
                scanned_files_s3_urls: Array.isArray(files) ? files : [],
                signed_report_pdf_url: pdfUrl,
                status: 'REPORT_UPLOADED',
            },
        }, { new: true });
        if (!booking)
            throw new common_1.BadRequestException('Radiology booking ID not found.');
        return {
            success: true,
            referring_doctor_id: booking.referring_doctor_id || null,
            message: 'تم حفظ تقرير الأشعة والصور الطبية بنجاح، وتفعيل إشعار العودة الآلي للطبيب المعالج.',
        };
    }
    async getWallet(_providerId, user) {
        const center = await this.centerFor(user);
        const centerId = this.isAdmin(user) ? undefined : center?._id;
        if (!this.isAdmin(user) && !center)
            throw new common_1.ForbiddenException('Radiology provider account not found');
        const completedBookings = await this.radBookingModel.find({
            ...(centerId ? { radiology_center_id: centerId } : {}),
            status: { $in: ['SCANNING_COMPLETED', 'REPORT_UPLOADED'] },
        });
        let grossRevenue = 0;
        let insuranceClaims = 0;
        const transactions = [];
        completedBookings.forEach((b) => {
            if (b.payment_method === 'insurance') {
                insuranceClaims += b.total_price || b.total || 0;
                transactions.push({ id: b.id, date: b.updatedAt, amount: b.total_price || b.total, type: 'INSURANCE_CLAIM_APPROVED', title: 'مطالبة تأمين معتمدة - ' + (b.scan_name_ar || 'فحص') });
            }
            else {
                grossRevenue += b.total_price || b.total || 0;
                transactions.push({ id: b.id, date: b.updatedAt, amount: b.total_price || b.total, type: 'CASH_SCAN', title: 'دفع نقدي - ' + (b.scan_name_ar || 'فحص') });
            }
        });
        const deductedCommissions = (grossRevenue + insuranceClaims) * 0.10;
        return {
            grossRevenue,
            insuranceClaims,
            deductedCommissions,
            transactions: transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        };
    }
    async getCatalog(_providerId) {
        return this.radServiceModel.find({ active: true, is_deleted: { $ne: true } });
    }
    async updateCatalogItem(serviceId, body, user) {
        if (!this.isAdmin(user))
            throw new common_1.ForbiddenException('Only administrators may modify the global radiology catalog');
        const allowed = ['active', 'cash_availability', 'home_visit_supported', 'estimated_duration_minutes', 'price'];
        const patch = Object.fromEntries(Object.entries(body || {}).filter(([key]) => allowed.includes(key)));
        if (!Object.keys(patch).length)
            throw new common_1.BadRequestException('No permitted catalog fields');
        return this.radServiceModel.findOneAndUpdate({ id: serviceId }, { $set: patch }, { new: true });
    }
    async getInventory(_providerId, user) {
        const pId = this.isAdmin(user) ? undefined : user.id;
        if (!pId && !this.isAdmin(user))
            throw new common_1.ForbiddenException('Radiology provider account not found');
        return this.radMachineModel.find({ ...(pId ? { provider_id: pId } : {}), is_active: true });
    }
    async addMachine(body, user) {
        if (this.isAdmin(user))
            throw new common_1.ForbiddenException('Admin must not create provider inventory');
        if (!body?.name || !body?.type)
            throw new common_1.BadRequestException('name and type are required');
        const machine = new this.radMachineModel({ provider_id: user.id, name: body.name, type: body.type, is_active: true });
        await machine.save();
        return machine;
    }
};
exports.RadiologyProviderController = RadiologyProviderController;
__decorate([
    (0, common_1.Get)('queue'),
    __param(0, (0, common_1.Query)('provider_id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RadiologyProviderController.prototype, "getProviderQueue", null);
__decorate([
    (0, common_1.Post)(':id/respond'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RadiologyProviderController.prototype, "respondBooking", null);
__decorate([
    (0, common_1.Post)('allocate-machine/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RadiologyProviderController.prototype, "allocateMachine", null);
__decorate([
    (0, common_1.Post)('finalize-scan/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RadiologyProviderController.prototype, "finalizeScan", null);
__decorate([
    (0, common_1.Get)('wallet'),
    __param(0, (0, common_1.Query)('provider_id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RadiologyProviderController.prototype, "getWallet", null);
__decorate([
    (0, common_1.Get)('catalog'),
    __param(0, (0, common_1.Query)('provider_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RadiologyProviderController.prototype, "getCatalog", null);
__decorate([
    (0, common_1.Post)('catalog/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RadiologyProviderController.prototype, "updateCatalogItem", null);
__decorate([
    (0, common_1.Get)('inventory'),
    __param(0, (0, common_1.Query)('provider_id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RadiologyProviderController.prototype, "getInventory", null);
__decorate([
    (0, common_1.Post)('inventory'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RadiologyProviderController.prototype, "addMachine", null);
exports.RadiologyProviderController = RadiologyProviderController = __decorate([
    (0, common_1.Controller)('radiology/provider'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.RADIOLOGY, enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN),
    __param(0, (0, mongoose_1.InjectModel)('RadiologyCenterBooking')),
    __param(1, (0, mongoose_1.InjectModel)('RadiologyService')),
    __param(2, (0, mongoose_1.InjectModel)('RadiologyMachine')),
    __param(3, (0, mongoose_1.InjectModel)('User')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], RadiologyProviderController);
//# sourceMappingURL=radiology-provider.controller.js.map