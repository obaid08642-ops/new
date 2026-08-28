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
exports.ProcurementService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const procurement_status_enum_1 = require("../enums/procurement-status.enum");
const procurementrequest_repository_1 = require("./repositories/procurementrequest.repository");
const quotation_repository_1 = require("./repositories/quotation.repository");
let ProcurementService = class ProcurementService {
    constructor(procurementModel, quotationModel) {
        this.procurementModel = procurementModel;
        this.quotationModel = quotationModel;
    }
    async createRequest(pharmacyId, createdBy, dto) {
        return this.procurementModel.create({
            pharmacy_id: String(pharmacyId),
            created_by: String(createdBy),
            items: dto.items,
            status: procurement_status_enum_1.ProcurementStatus.PENDING_ADMIN_REVIEW,
        });
    }
    async getPharmacyRequests(pharmacyId) {
        return this.procurementModel
            .find({ pharmacy_id: String(pharmacyId) })
            .sort({ createdAt: -1 })
            .lean();
    }
    async getPharmacyRequest(pharmacyId, requestId) {
        const req = await this.procurementModel
            .findOne({ _id: new mongoose_1.Types.ObjectId(requestId), pharmacy_id: String(pharmacyId) })
            .lean();
        if (!req)
            throw new common_1.NotFoundException('Procurement request not found');
        return req;
    }
    async submitPharmacyFeedback(pharmacyId, requestId, dto) {
        const req = await this.procurementModel.findOne({ _id: new mongoose_1.Types.ObjectId(requestId), pharmacy_id: String(pharmacyId) });
        if (!req)
            throw new common_1.NotFoundException('Procurement request not found');
        if (req.status !== procurement_status_enum_1.ProcurementStatus.QUOTATION_ISSUED) {
            throw new common_1.BadRequestException(`Cannot respond to quotation when status is '${req.status}'. Expected '${procurement_status_enum_1.ProcurementStatus.QUOTATION_ISSUED}'.`);
        }
        const allowedStatuses = [
            procurement_status_enum_1.ProcurementStatus.APPROVED_BY_PHARMACY,
            procurement_status_enum_1.ProcurementStatus.CANCELLED,
        ];
        if (!allowedStatuses.includes(dto.status)) {
            throw new common_1.BadRequestException('Invalid status transition');
        }
        req.status = dto.status;
        req.pharmacyFeedback = dto.pharmacyFeedback;
        await req.save();
        await this.quotationModel.updateOne({ procurementRequestId: requestId }, { status: dto.status });
        return req;
    }
    async adminListRequests(status) {
        const filter = status ? { status } : {};
        return this.procurementModel.find(filter).sort({ createdAt: -1 }).lean();
    }
    async adminGetRequest(requestId) {
        const req = await this.procurementModel.findById(requestId).lean();
        if (!req)
            throw new common_1.NotFoundException('Procurement request not found');
        return req;
    }
    async adminSummary() {
        const rows = await this.procurementModel.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 }, items: { $sum: { $size: { $ifNull: ['$items', []] } } } } },
        ]);
        const by_status = {};
        let total_items = 0;
        for (const r of rows) {
            by_status[r._id || 'UNKNOWN'] = r.count;
            total_items += r.items || 0;
        }
        return { by_status, total_requests: rows.reduce((a, r) => a + r.count, 0), total_items };
    }
    async adminExportCsv(requestId) {
        const req = await this.adminGetRequest(requestId);
        const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const header = ['اسم الصنف', 'الكمية المطلوبة', 'الفئة', 'مطابق للكتالوج', 'ملاحظات'];
        const lines = (req.items || []).map((it) => [
            esc(it.raw_name_string || it.medicine_name || ''),
            esc(it.requested_quantity ?? it.quantity ?? ''),
            esc(it.category_group === 'non_medical' ? 'غير دوائية' : 'أدوية'),
            esc(it.medicine_id ? 'نعم' : 'لا'),
            esc(it.notes || ''),
        ].join(','));
        return '﻿' + header.map(esc).join(',') + '\n' + lines.join('\n') + '\n';
    }
    async adminStartReview(requestId) {
        const req = await this.procurementModel.findById(requestId);
        if (!req)
            throw new common_1.NotFoundException('Procurement request not found');
        if (req.status !== procurement_status_enum_1.ProcurementStatus.PENDING_ADMIN_REVIEW) {
            throw new common_1.BadRequestException(`Cannot start review when status is '${req.status}'.`);
        }
        return req;
    }
    async adminCreateQuotation(adminId, requestId, dto) {
        const req = await this.procurementModel.findById(requestId);
        if (!req)
            throw new common_1.NotFoundException('Procurement request not found');
        const validStatuses = [
            procurement_status_enum_1.ProcurementStatus.PENDING_ADMIN_REVIEW,
        ];
        if (!validStatuses.includes(req.status)) {
            throw new common_1.BadRequestException(`Cannot create quotation when status is '${req.status}'.`);
        }
        await this.quotationModel.deleteMany({ procurementRequestId: requestId });
        const quotation = await this.quotationModel.create({
            procurementRequestId: requestId,
            adminId,
            items: dto.items,
            totalPrice: dto.totalPrice,
            adminNotes: dto.adminNotes,
            status: procurement_status_enum_1.ProcurementStatus.QUOTATION_ISSUED,
        });
        req.status = procurement_status_enum_1.ProcurementStatus.QUOTATION_ISSUED;
        req.quotationId = quotation._id?.toString();
        await req.save();
        return quotation;
    }
    async adminGetQuotation(requestId) {
        const quotation = await this.quotationModel
            .findOne({ procurementRequestId: requestId })
            .lean();
        if (!quotation)
            throw new common_1.NotFoundException('Quotation not found for this request');
        return quotation;
    }
    async adminCancelRequest(requestId) {
        const req = await this.procurementModel.findById(requestId);
        if (!req)
            throw new common_1.NotFoundException('Procurement request not found');
        const nonCancellable = [
            procurement_status_enum_1.ProcurementStatus.APPROVED_BY_PHARMACY,
            procurement_status_enum_1.ProcurementStatus.COMPLETED,
            procurement_status_enum_1.ProcurementStatus.CANCELLED,
        ];
        if (nonCancellable.includes(req.status)) {
            throw new common_1.BadRequestException(`Cannot cancel request with status '${req.status}'.`);
        }
        req.status = procurement_status_enum_1.ProcurementStatus.CANCELLED;
        return req.save();
    }
    async adminCompleteRequest(requestId) {
        const req = await this.procurementModel.findById(requestId);
        if (!req)
            throw new common_1.NotFoundException('Procurement request not found');
        if (req.status !== procurement_status_enum_1.ProcurementStatus.APPROVED_BY_PHARMACY) {
            throw new common_1.BadRequestException(`Cannot complete request when status is '${req.status}'. Expected APPROVED_BY_PHARMACY.`);
        }
        req.status = procurement_status_enum_1.ProcurementStatus.COMPLETED;
        return req.save();
    }
};
exports.ProcurementService = ProcurementService;
exports.ProcurementService = ProcurementService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('ProcurementRequestRepository')),
    __param(1, (0, common_1.Inject)('QuotationRepository')),
    __metadata("design:paramtypes", [procurementrequest_repository_1.ProcurementRequestRepository,
        quotation_repository_1.QuotationRepository])
], ProcurementService);
//# sourceMappingURL=procurement.service.js.map