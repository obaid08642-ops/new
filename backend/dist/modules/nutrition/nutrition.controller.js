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
exports.NutritionController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_guard_1 = require("../../common/auth.guard");
const nutrition_service_1 = require("./nutrition.service");
let NutritionController = class NutritionController {
    constructor(nutritionService) {
        this.nutritionService = nutritionService;
    }
    authenticatedPatientId(req) {
        const userId = req?.user?.id;
        if (typeof userId !== 'string' || userId.trim().length === 0) {
            throw new common_1.UnauthorizedException('authenticated_patient_required');
        }
        return userId;
    }
    getProfile(req) {
        return this.nutritionService.getProfile(this.authenticatedPatientId(req));
    }
    updateProfile(req, body) {
        return this.nutritionService.updateProfile(this.authenticatedPatientId(req), body);
    }
    logMeal(req, body) {
        return this.nutritionService.logMeal(this.authenticatedPatientId(req), body);
    }
    getMealHistory(req, date) {
        return this.nutritionService.getMealHistory(this.authenticatedPatientId(req), date);
    }
    getDailySummary(req, date) {
        return this.nutritionService.getDailySummary(this.authenticatedPatientId(req), date);
    }
    logWater(req, body) {
        return this.nutritionService.logWater(this.authenticatedPatientId(req), body.amount_ml);
    }
    getWaterHistory(req, date) {
        return this.nutritionService.getWaterHistory(this.authenticatedPatientId(req), date);
    }
    logExercise(req, body) {
        return this.nutritionService.logExercise(this.authenticatedPatientId(req), body);
    }
    getExerciseHistory(req, date) {
        return this.nutritionService.getExerciseHistory(this.authenticatedPatientId(req), date);
    }
    getWeeklyReport(req) {
        return this.nutritionService.getWeeklyReport(this.authenticatedPatientId(req));
    }
};
exports.NutritionController = NutritionController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get nutrition profile | الحصول على الملف الغذائي' }),
    (0, common_1.Get)('profile'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NutritionController.prototype, "getProfile", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update nutrition profile | تحديث الملف الغذائي' }),
    (0, common_1.Post)('profile'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], NutritionController.prototype, "updateProfile", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Log a meal | تسجيل وجبة' }),
    (0, common_1.Post)('meals'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], NutritionController.prototype, "logMeal", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get meal history | سجل الوجبات' }),
    (0, common_1.Get)('meals'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], NutritionController.prototype, "getMealHistory", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get daily nutrition summary | ملخص التغذية اليومي' }),
    (0, common_1.Get)('daily-summary'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], NutritionController.prototype, "getDailySummary", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Log water intake | تسجيل شرب الماء' }),
    (0, common_1.Post)('water'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], NutritionController.prototype, "logWater", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get water history | سجل شرب الماء' }),
    (0, common_1.Get)('water'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], NutritionController.prototype, "getWaterHistory", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Log exercise | تسجيل تمرين' }),
    (0, common_1.Post)('exercise'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], NutritionController.prototype, "logExercise", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get exercise history | سجل التمارين' }),
    (0, common_1.Get)('exercise'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], NutritionController.prototype, "getExerciseHistory", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get weekly nutrition report | تقرير التغذية الأسبوعي' }),
    (0, common_1.Get)('weekly-report'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NutritionController.prototype, "getWeeklyReport", null);
exports.NutritionController = NutritionController = __decorate([
    (0, swagger_1.ApiTags)('Nutrition | التغذية'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('nutrition'),
    __metadata("design:paramtypes", [nutrition_service_1.NutritionService])
], NutritionController);
//# sourceMappingURL=nutrition.controller.js.map