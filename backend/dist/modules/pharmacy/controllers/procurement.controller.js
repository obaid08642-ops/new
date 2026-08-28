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
exports.ProcurementController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const procurement_request_schema_1 = require("../schemas/procurement-request.schema");
const procurement_service_1 = require("../services/procurement.service");
const auth_guard_1 = require("../../../common/auth.guard");
const enums_1 = require("../../../common/enums");
const ai_gateway_service_1 = require("../../ai/ai-gateway.service");
const medicine_schema_1 = require("../../../schemas/medicine.schema");
let ProcurementController = class ProcurementController {
    constructor(procurementModel, medicineModel, procurementService, ai) {
        this.procurementModel = procurementModel;
        this.medicineModel = medicineModel;
        this.procurementService = procurementService;
        this.ai = ai;
    }
    async createProcurementRequest(user, dto) {
        const items = (Array.isArray(dto.items) ? dto.items : []).slice(0, 500).map((it) => ({
            medicine_id: it.medicine_id && mongoose_2.Types.ObjectId.isValid(it.medicine_id) ? new mongoose_2.Types.ObjectId(it.medicine_id) : null,
            raw_name_string: String(it.raw_name_string || it.name || '').slice(0, 300),
            requested_quantity: Math.max(1, Math.min(Number(it.requested_quantity || it.quantity) || 1, 100000)),
            category_group: it.category_group === 'non_medical' ? 'non_medical' : 'medical',
            notes: it.notes ? String(it.notes).slice(0, 500) : undefined,
        })).filter((it) => it.raw_name_string);
        if (items.length === 0 && !dto.fileUrl)
            throw new common_1.BadRequestException('items_or_file_required');
        const request = await this.procurementModel.create({
            pharmacy_id: String(user.id),
            created_by: String(user.id),
            items,
            uploaded_file_url: dto.fileUrl ? String(dto.fileUrl).slice(0, 1000) : null,
            status: 'PENDING_ADMIN_REVIEW',
        });
        return { success: true, procurement_id: request._id, message: 'تم إرسال طلب النواقص بنجاح وجاري مراجعته من قبل إدارة المستودعات.' };
    }
    async listRequests(user) {
        const list = await this.procurementModel.find({ pharmacy_id: String(user.id) }).sort({ createdAt: -1 });
        return { success: true, data: list };
    }
    async feedback(user, id, dto) {
        return this.procurementService.submitPharmacyFeedback(user.id, id, {
            status: dto?.status,
            pharmacyFeedback: dto?.pharmacyFeedback,
        });
    }
    async analyzeFile(user, body) {
        if (!body?.file_base64 && !body?.text)
            throw new common_1.BadRequestException('file_base64 or text is required');
        if (body.file_base64 && body.file_base64.length > 8_000_000)
            throw new common_1.BadRequestException('file too large (max ~6MB)');
        const prompt = [
            'أنت مساعد صيدلاني. استخرج من ' + (body.file_base64 ? 'هذه الصورة/المستند' : 'هذا النص') + ' قائمة الأصناف المطلوبة (أدوية أو مستلزمات).',
            'أرجع JSON فقط بهذا الشكل بدون أي نص إضافي:',
            '{"items":[{"name":"اسم الصنف كما ورد","quantity":10}]}',
            'إن لم تتضح الكمية اجعلها 1. لا تخترع أصنافاً غير موجودة في المصدر.',
        ].join('\n');
        const result = await this.ai.generate({
            prompt,
            feature: 'procurement_analyze',
            imageBase64: body.file_base64,
            mimeType: body.mime_type || 'image/jpeg',
        });
        let extracted = [];
        try {
            const m = String(result.text || '').match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(m ? m[0] : result.text);
            if (Array.isArray(parsed?.items)) {
                extracted = parsed.items
                    .filter((i) => i && i.name)
                    .slice(0, 200)
                    .map((i) => ({ name: String(i.name).slice(0, 300), quantity: Math.max(1, Number(i.quantity) || 1) }));
            }
        }
        catch { }
        const items = await Promise.all(extracted.map(async (it) => {
            const escaped = it.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const med = await this.medicineModel.findOne({
                is_deleted: { $ne: true },
                $or: [
                    { name_ar: { $regex: escaped, $options: 'i' } },
                    { name_en: { $regex: escaped, $options: 'i' } },
                    { active_ingredient: { $regex: escaped, $options: 'i' } },
                ],
            }).lean();
            const categoryGroup = med && med.category && med.category !== 'medications' ? 'non_medical' : 'medical';
            return {
                raw_name_string: it.name,
                requested_quantity: it.quantity,
                matched: !!med,
                medicine_id: med?._id || null,
                medicine_name: med ? (med.name_ar || med.name_en) : null,
                category_group: categoryGroup,
            };
        }));
        return {
            ok: true,
            provider: result.provider,
            model: result.model,
            items,
            counts: {
                total: items.length,
                matched: items.filter(i => i.matched).length,
                medical: items.filter(i => i.category_group === 'medical').length,
                non_medical: items.filter(i => i.category_group === 'non_medical').length,
            },
        };
    }
};
exports.ProcurementController = ProcurementController;
__decorate([
    (0, common_1.Post)('submit-request'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.PHARMACY, enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProcurementController.prototype, "createProcurementRequest", null);
__decorate([
    (0, common_1.Get)('my-requests'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.PHARMACY, enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProcurementController.prototype, "listRequests", null);
__decorate([
    (0, common_1.Post)(':id/feedback'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.PHARMACY),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ProcurementController.prototype, "feedback", null);
__decorate([
    (0, common_1.Post)('analyze-file'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.PHARMACY, enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProcurementController.prototype, "analyzeFile", null);
exports.ProcurementController = ProcurementController = __decorate([
    (0, common_1.Controller)('pharmacy/procurement'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, mongoose_1.InjectModel)(procurement_request_schema_1.ProcurementRequest.name)),
    __param(1, (0, mongoose_1.InjectModel)(medicine_schema_1.Medicine.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        procurement_service_1.ProcurementService,
        ai_gateway_service_1.AiGatewayService])
], ProcurementController);
//# sourceMappingURL=procurement.controller.js.map