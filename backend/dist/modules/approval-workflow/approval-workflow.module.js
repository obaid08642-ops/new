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
exports.ApprovalWorkflowModule = exports.ApprovalWorkflowController = exports.ApprovalWorkflowService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const audit_log_interceptor_1 = require("../../common/audit-log.interceptor");
const enums_1 = require("../../common/enums");
const approval_request_schema_1 = require("../../schemas/approval-request.schema");
const medicine_schema_1 = require("../../schemas/medicine.schema");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
const facility_schema_1 = require("../../schemas/facility.schema");
const lab_schema_1 = require("../../schemas/lab.schema");
const radiology_schema_1 = require("../../schemas/radiology.schema");
const home_care_schema_1 = require("../../schemas/home-care.schema");
const catalog_publication_service_1 = require("../events/catalog-publication.service");
let ApprovalWorkflowService = class ApprovalWorkflowService {
    constructor(reqModel, medicineModel, providerModel, facilityModel, labModel, radiologyModel, homeCareModel, publication) {
        this.reqModel = reqModel;
        this.medicineModel = medicineModel;
        this.providerModel = providerModel;
        this.facilityModel = facilityModel;
        this.labModel = labModel;
        this.radiologyModel = radiologyModel;
        this.homeCareModel = homeCareModel;
        this.publication = publication;
    }
    async createRequest(userId, dto) {
        if (!dto.entity_type || !dto.change_data) {
            throw new common_1.BadRequestException('entity_type and change_data are required');
        }
        let nextVersion = 1;
        if (dto.entity_id) {
            const lastRequest = await this.reqModel
                .findOne({ entity_type: dto.entity_type, entity_id: dto.entity_id })
                .sort({ version: -1 })
                .lean();
            if (lastRequest)
                nextVersion = lastRequest.version + 1;
        }
        return this.reqModel.create({
            entity_type: dto.entity_type,
            entity_id: dto.entity_id,
            submitted_by: userId,
            change_data: dto.change_data,
            status: approval_request_schema_1.ApprovalStatus.PENDING_REVIEW,
            version: nextVersion,
        });
    }
    async listPending() {
        return this.reqModel.find({ status: approval_request_schema_1.ApprovalStatus.PENDING_REVIEW }).sort({ createdAt: -1 }).lean();
    }
    async listMyRequests(userId) {
        return this.reqModel.find({ submitted_by: userId }).sort({ createdAt: -1 }).lean();
    }
    async getRequestDetails(id) {
        const req = await this.reqModel.findOne({ id }).lean();
        if (!req)
            throw new common_1.NotFoundException('Request not found');
        return req;
    }
    async decide(adminUserId, requestId, dto) {
        const req = await this.reqModel.findOne({ id: requestId });
        if (!req)
            throw new common_1.NotFoundException('Request not found');
        if (req.status !== approval_request_schema_1.ApprovalStatus.PENDING_REVIEW) {
            throw new common_1.BadRequestException('Request is already decided');
        }
        if (dto.decision === 'rejected') {
            req.status = approval_request_schema_1.ApprovalStatus.REJECTED;
            req.reviewed_by = adminUserId;
            req.reviewed_at = new Date();
            req.rejected_reason = dto.notes;
            await req.save();
            return req.toObject();
        }
        req.status = approval_request_schema_1.ApprovalStatus.APPROVED;
        req.reviewed_by = adminUserId;
        req.reviewed_at = new Date();
        const reviewedAt = new Date();
        const requestedData = dto.edit_data ? { ...req.change_data, ...dto.edit_data } : req.change_data;
        const finalData = {
            ...requestedData,
            public_eligibility: true,
            indexing_eligibility: false,
            medical_review_status: 'approved',
            last_reviewed: reviewedAt,
            provenance: `approval_workflow:${requestId}`,
        };
        let publicationType;
        if (req.entity_type === 'medicine') {
            publicationType = 'medicine';
            if (req.entity_id) {
                await this.medicineModel.updateOne({ id: req.entity_id }, { $set: finalData });
            }
            else {
                const newDoc = await this.medicineModel.create(finalData);
                req.entity_id = newDoc.id;
            }
        }
        else if (req.entity_type === 'provider') {
            publicationType = 'provider';
            if (req.entity_id) {
                await this.providerModel.updateOne({ id: req.entity_id }, { $set: finalData });
            }
            else {
                const newDoc = await this.providerModel.create(finalData);
                req.entity_id = newDoc.id;
            }
        }
        else if (req.entity_type === 'facility') {
            publicationType = 'facility';
            if (req.entity_id) {
                await this.facilityModel.updateOne({ id: req.entity_id }, { $set: finalData });
            }
            else {
                const newDoc = await this.facilityModel.create(finalData);
                req.entity_id = newDoc.id;
            }
        }
        else if (req.entity_type === 'service') {
            const serviceType = String(requestedData.type || req.change_data.type || '').toLowerCase();
            const isLab = serviceType === 'lab' || serviceType === 'laboratory';
            const isHomeCare = serviceType === 'home_care' || serviceType === 'home-care' || serviceType === 'nursing';
            publicationType = isLab ? 'lab_service' : isHomeCare ? 'home_care_service' : 'radiology_service';
            const model = isLab ? this.labModel : isHomeCare ? this.homeCareModel : this.radiologyModel;
            if (req.entity_id) {
                await model.updateOne({ id: req.entity_id }, { $set: finalData });
            }
            else {
                const newDoc = await model.create(finalData);
                req.entity_id = newDoc.id;
            }
        }
        await req.save();
        await this.publication.refresh({
            entityType: publicationType,
            entityId: req.entity_id,
            actorId: adminUserId,
            actorRole: 'admin',
            reason: 'approval_workflow_approved',
            idempotencyKey: `approval-workflow:${requestId}:approved`,
        });
        return req.toObject();
    }
};
exports.ApprovalWorkflowService = ApprovalWorkflowService;
exports.ApprovalWorkflowService = ApprovalWorkflowService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('ApprovalRequest')),
    __param(1, (0, mongoose_1.InjectModel)('Medicine')),
    __param(2, (0, mongoose_1.InjectModel)('ProviderProfile')),
    __param(3, (0, mongoose_1.InjectModel)('Facility')),
    __param(4, (0, mongoose_1.InjectModel)('LabService')),
    __param(5, (0, mongoose_1.InjectModel)('RadiologyService')),
    __param(6, (0, mongoose_1.InjectModel)('HomeCareService')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        catalog_publication_service_1.CatalogPublicationService])
], ApprovalWorkflowService);
let ApprovalWorkflowController = class ApprovalWorkflowController {
    constructor(svc) {
        this.svc = svc;
    }
    create(u, b) {
        return this.svc.createRequest(u.id, b);
    }
    myRequests(u) {
        return this.svc.listMyRequests(u.id);
    }
    pending() {
        return this.svc.listPending();
    }
    details(id) {
        return this.svc.getRequestDetails(id);
    }
    decide(u, id, b) {
        return this.svc.decide(u.id, id, b);
    }
};
exports.ApprovalWorkflowController = ApprovalWorkflowController;
__decorate([
    (0, common_1.Post)('requests'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ApprovalWorkflowController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('my-requests'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ApprovalWorkflowController.prototype, "myRequests", null);
__decorate([
    (0, common_1.Get)('requests/pending'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ApprovalWorkflowController.prototype, "pending", null);
__decorate([
    (0, common_1.Get)('requests/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ApprovalWorkflowController.prototype, "details", null);
__decorate([
    (0, common_1.Post)('requests/:id/decide'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    (0, audit_log_interceptor_1.Audited)({ model: 'ApprovalRequest', idParam: 'id', action: 'approval_request_decide' }),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ApprovalWorkflowController.prototype, "decide", null);
exports.ApprovalWorkflowController = ApprovalWorkflowController = __decorate([
    (0, common_1.Controller)('approval-workflow'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ApprovalWorkflowService])
], ApprovalWorkflowController);
let ApprovalWorkflowModule = class ApprovalWorkflowModule {
};
exports.ApprovalWorkflowModule = ApprovalWorkflowModule;
exports.ApprovalWorkflowModule = ApprovalWorkflowModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'ApprovalRequest', schema: approval_request_schema_1.ApprovalRequestSchema },
                { name: 'Medicine', schema: medicine_schema_1.MedicineSchema },
                { name: 'ProviderProfile', schema: provider_profile_schema_1.ProviderProfileSchema },
                { name: 'Facility', schema: facility_schema_1.FacilitySchema },
                { name: 'LabService', schema: lab_schema_1.LabServiceSchema },
                { name: 'RadiologyService', schema: radiology_schema_1.RadiologyServiceSchema },
                { name: 'HomeCareService', schema: home_care_schema_1.HomeCareServiceSchema },
            ]),
        ],
        controllers: [ApprovalWorkflowController],
        providers: [ApprovalWorkflowService],
        exports: [ApprovalWorkflowService],
    })
], ApprovalWorkflowModule);
//# sourceMappingURL=approval-workflow.module.js.map