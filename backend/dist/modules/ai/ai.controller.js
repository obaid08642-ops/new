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
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const platform_express_1 = require("@nestjs/platform-express");
const ai_service_1 = require("./ai.service");
const ai_gateway_service_1 = require("./ai-gateway.service");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
let AiController = class AiController {
    constructor(svc, gateway) {
        this.svc = svc;
        this.gateway = gateway;
    }
    getConfig() {
        return this.svc.getAiConfig();
    }
    updateConfig(body) {
        return this.svc.updateAiConfig(body);
    }
    gatewayStatus() {
        throw new common_1.ServiceUnavailableException('admin AI gateway control is unavailable pending approved health-data governance and change-audit controls');
    }
    updateProvider(key, body) {
        throw new common_1.ServiceUnavailableException('admin AI provider mutation is unavailable pending approved health-data governance and change-audit controls');
    }
    setMode(body) {
        throw new common_1.ServiceUnavailableException('admin AI routing mutation is unavailable pending approved health-data governance and change-audit controls');
    }
    usage(days) {
        throw new common_1.ServiceUnavailableException('admin AI usage access is unavailable pending approved health-data governance and change-audit controls');
    }
    triage(req, body) {
        return this.svc.triage(body, req.user?.id);
    }
    triageHistory(req, limit) {
        return this.svc.triageHistory(req.user?.id, limit === undefined ? 50 : Number(limit));
    }
    voice(file, body) {
        if (file) {
            return this.svc.voiceToOrderFile(file.buffer);
        }
        return this.svc.voiceToOrder(body.transcript || '');
    }
    ocr(body) {
        const base64 = body.image_base64 || body.imageBase64 || '';
        return this.svc.prescriptionOcr(base64);
    }
    parseExcel(file) {
        if (!file)
            throw new Error('No file uploaded');
        return this.svc.parseExcel(file.buffer);
    }
    copilotSuggest(body) {
        return this.svc.copilotSuggest(body.notes || '');
    }
    ocrTranslate(body) {
        return this.svc.ocrTranslate(body.image_base64 || '', body.target_lang || 'ar');
    }
    skinAnalysis(req, body) {
        return this.svc.skinAnalysis(body, req.user?.id);
    }
    medicineImageSearch(body) {
        return this.svc.medicineImageSearch(body.image_base64);
    }
    barcodeLookup(body) {
        return this.svc.barcodeLookup(body.code);
    }
    analyzeMeal(body) {
        return this.svc.analyzeMeal(body.query || '', body.image_base64);
    }
    analyzeReport() {
        return this.svc.analyzeReportForPatient();
    }
    generateExercisePlan(body) {
        return this.svc.generateExercisePlan(body || {});
    }
    generateDietPlan(body) {
        return this.svc.generateDietPlan(body);
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Get)('config'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AiController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Post)('config'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "updateConfig", null);
__decorate([
    (0, common_1.Get)('admin/gateway'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AiController.prototype, "gatewayStatus", null);
__decorate([
    (0, common_1.Post)('admin/gateway/provider/:key'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "updateProvider", null);
__decorate([
    (0, common_1.Post)('admin/gateway/mode'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "setMode", null);
__decorate([
    (0, common_1.Get)('admin/usage'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "usage", null);
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    (0, common_1.Post)('triage'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "triage", null);
__decorate([
    (0, common_1.Get)('triage/history'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "triageHistory", null);
__decorate([
    (0, common_1.Post)('voice-to-order'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('audio', {
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (!/\.(mp3|m4a|wav|ogg|webm|aac|flac)$/i.test(file.originalname || '')) {
                return cb(new common_1.BadRequestException('audio_files_only'), false);
            }
            cb(null, true);
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "voice", null);
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 15, ttl: 60000 } }),
    (0, common_1.Post)('prescription-ocr'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "ocr", null);
__decorate([
    (0, common_1.Post)('parse-excel'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('document', {
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (!/\.(xls|xlsx|csv)$/i.test(file.originalname || '')) {
                return cb(new common_1.BadRequestException('spreadsheet_files_only'), false);
            }
            cb(null, true);
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "parseExcel", null);
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 15, ttl: 60000 } }),
    (0, common_1.Post)('copilot/suggest'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "copilotSuggest", null);
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 15, ttl: 60000 } }),
    (0, common_1.Post)('ocr-translate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "ocrTranslate", null);
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    (0, common_1.Post)('skin-analysis'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "skinAnalysis", null);
__decorate([
    (0, common_1.Post)('medicine-image-search'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "medicineImageSearch", null);
__decorate([
    (0, common_1.Post)('barcode-lookup'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "barcodeLookup", null);
__decorate([
    (0, common_1.Post)('analyze-meal'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "analyzeMeal", null);
__decorate([
    (0, common_1.Post)('analyze-report'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AiController.prototype, "analyzeReport", null);
__decorate([
    (0, common_1.Post)('generate-exercise-plan'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "generateExercisePlan", null);
__decorate([
    (0, common_1.Post)('generate-diet-plan'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "generateDietPlan", null);
exports.AiController = AiController = __decorate([
    (0, common_1.Controller)('ai'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ai_service_1.AiService, ai_gateway_service_1.AiGatewayService])
], AiController);
//# sourceMappingURL=ai.controller.js.map