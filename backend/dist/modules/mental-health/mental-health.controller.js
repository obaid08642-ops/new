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
exports.MentalHealthController = void 0;
const auth_guard_1 = require("../../common/auth.guard");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const mental_health_service_1 = require("./mental-health.service");
let MentalHealthController = class MentalHealthController {
    constructor(mentalHealthService) {
        this.mentalHealthService = mentalHealthService;
    }
    patientId(req) {
        const userId = req?.user?.id;
        if (typeof userId !== 'string' || !userId.trim()) {
            throw new common_1.UnauthorizedException('المصادقة مطلوبة / Authentication is required');
        }
        return userId;
    }
    logMood(req, body) {
        return this.mentalHealthService.logMood(this.patientId(req), body);
    }
    getMoodHistory(req, days) {
        return this.mentalHealthService.getMoodHistory(this.patientId(req), days === undefined ? 30 : Number(days));
    }
    getMoodStats(req) {
        return this.mentalHealthService.getMoodStats(this.patientId(req));
    }
    logMeditation(req, body) {
        return this.mentalHealthService.logMeditation(this.patientId(req), body);
    }
    getMeditationHistory(req) {
        return this.mentalHealthService.getMeditationHistory(this.patientId(req));
    }
    getMeditationStats(req) {
        return this.mentalHealthService.getMeditationStats(this.patientId(req));
    }
    logBreathing(req, body) {
        return this.mentalHealthService.logBreathing(this.patientId(req), body);
    }
    getBreathingHistory(req) {
        return this.mentalHealthService.getBreathingHistory(this.patientId(req));
    }
    getCrisisContacts(req) {
        return this.mentalHealthService.getCrisisContacts(this.patientId(req));
    }
    addCrisisContact(req, body) {
        return this.mentalHealthService.addCrisisContact(this.patientId(req), body);
    }
    deleteCrisisContact(req, id) {
        return this.mentalHealthService.deleteCrisisContact(this.patientId(req), id);
    }
    getDashboard(req) {
        return this.mentalHealthService.getDashboard(this.patientId(req));
    }
};
exports.MentalHealthController = MentalHealthController;
__decorate([
    (0, common_1.Post)('mood'),
    (0, swagger_1.ApiOperation)({ summary: 'Log a self-reported mood entry / تسجيل مزاج مُبلّغ عنه ذاتياً' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MentalHealthController.prototype, "logMood", null);
__decorate([
    (0, common_1.Get)('mood'),
    (0, swagger_1.ApiOperation)({ summary: 'Get self-reported mood history / سجل المزاج المُبلّغ عنه ذاتياً' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MentalHealthController.prototype, "getMoodHistory", null);
__decorate([
    (0, common_1.Get)('mood/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get descriptive mood statistics without clinical interpretation / إحصاءات وصفية للمزاج دون تفسير سريري' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MentalHealthController.prototype, "getMoodStats", null);
__decorate([
    (0, common_1.Post)('meditation'),
    (0, swagger_1.ApiOperation)({ summary: 'Log an optional mindfulness practice / تسجيل ممارسة يقظة ذهنية اختيارية' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MentalHealthController.prototype, "logMeditation", null);
__decorate([
    (0, common_1.Get)('meditation'),
    (0, swagger_1.ApiOperation)({ summary: 'Get mindfulness practice history / سجل ممارسات اليقظة الذهنية' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MentalHealthController.prototype, "getMeditationHistory", null);
__decorate([
    (0, common_1.Get)('meditation/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get optional practice totals / إجماليات الممارسة الاختيارية' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MentalHealthController.prototype, "getMeditationStats", null);
__decorate([
    (0, common_1.Post)('breathing'),
    (0, swagger_1.ApiOperation)({ summary: 'Log a breathing practice / تسجيل ممارسة تنفّس' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MentalHealthController.prototype, "logBreathing", null);
__decorate([
    (0, common_1.Get)('breathing'),
    (0, swagger_1.ApiOperation)({ summary: 'Get breathing practice history / سجل ممارسات التنفس' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MentalHealthController.prototype, "getBreathingHistory", null);
__decorate([
    (0, common_1.Get)('crisis-contacts'),
    (0, swagger_1.ApiOperation)({ summary: 'Get personal crisis contacts / جهات المساعدة الشخصية' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MentalHealthController.prototype, "getCrisisContacts", null);
__decorate([
    (0, common_1.Post)('crisis-contacts'),
    (0, swagger_1.ApiOperation)({ summary: 'Add a personal crisis contact / إضافة جهة مساعدة شخصية' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MentalHealthController.prototype, "addCrisisContact", null);
__decorate([
    (0, common_1.Delete)('crisis-contacts/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a personal crisis contact / حذف جهة مساعدة شخصية' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MentalHealthController.prototype, "deleteCrisisContact", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Get the non-diagnostic wellbeing dashboard / لوحة دعم ذاتي غير تشخيصية' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MentalHealthController.prototype, "getDashboard", null);
exports.MentalHealthController = MentalHealthController = __decorate([
    (0, swagger_1.ApiTags)('Mental Health – الصحة النفسية'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('mental-health'),
    __metadata("design:paramtypes", [mental_health_service_1.MentalHealthService])
], MentalHealthController);
//# sourceMappingURL=mental-health.controller.js.map