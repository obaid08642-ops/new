"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NutritionModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const nutrition_service_1 = require("./nutrition.service");
const nutrition_controller_1 = require("./nutrition.controller");
const nutrition_schema_1 = require("../../schemas/nutrition.schema");
const exerciselog_repository_1 = require("./repositories/exerciselog.repository");
const meallog_repository_1 = require("./repositories/meallog.repository");
const nutritionprofile_repository_1 = require("./repositories/nutritionprofile.repository");
const waterlog_repository_1 = require("./repositories/waterlog.repository");
let NutritionModule = class NutritionModule {
};
exports.NutritionModule = NutritionModule;
exports.NutritionModule = NutritionModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'NutritionProfile', schema: nutrition_schema_1.NutritionProfileSchema },
                { name: 'MealLog', schema: nutrition_schema_1.MealLogSchema },
                { name: 'WaterLog', schema: nutrition_schema_1.WaterLogSchema },
                { name: 'ExerciseLog', schema: nutrition_schema_1.ExerciseLogSchema },
            ]),
        ],
        controllers: [nutrition_controller_1.NutritionController],
        providers: [nutrition_service_1.NutritionService, { provide: 'ExerciseLogRepository', useClass: exerciselog_repository_1.ExerciseLogRepository }, { provide: 'MealLogRepository', useClass: meallog_repository_1.MealLogRepository }, { provide: 'NutritionProfileRepository', useClass: nutritionprofile_repository_1.NutritionProfileRepository }, { provide: 'WaterLogRepository', useClass: waterlog_repository_1.WaterLogRepository }],
        exports: [nutrition_service_1.NutritionService],
    })
], NutritionModule);
//# sourceMappingURL=nutrition.module.js.map