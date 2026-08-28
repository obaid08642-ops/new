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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExerciseLogSchema = exports.ExerciseLog = exports.WaterLogSchema = exports.WaterLog = exports.MealLogSchema = exports.MealLog = exports.NutritionProfileSchema = exports.NutritionProfile = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let NutritionProfile = class NutritionProfile {
};
exports.NutritionProfile = NutritionProfile;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], NutritionProfile.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['weight_loss', 'muscle_gain', 'healthy_lifestyle', 'maintain'] }),
    __metadata("design:type", String)
], NutritionProfile.prototype, "goal", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], NutritionProfile.prototype, "height_cm", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], NutritionProfile.prototype, "weight_kg", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], NutritionProfile.prototype, "target_weight_kg", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], NutritionProfile.prototype, "bmi", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], NutritionProfile.prototype, "body_fat_percent", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], NutritionProfile.prototype, "daily_calorie_target", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], NutritionProfile.prototype, "daily_water_target_ml", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'] }),
    __metadata("design:type", String)
], NutritionProfile.prototype, "activity_level", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], NutritionProfile.prototype, "dietary_restrictions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], NutritionProfile.prototype, "allergies", void 0);
exports.NutritionProfile = NutritionProfile = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'nutrition_profiles' })
], NutritionProfile);
exports.NutritionProfileSchema = mongoose_1.SchemaFactory.createForClass(NutritionProfile);
let MealLog = class MealLog {
};
exports.MealLog = MealLog;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], MealLog.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], MealLog.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], MealLog.prototype, "calories", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], MealLog.prototype, "protein_g", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], MealLog.prototype, "carbs_g", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], MealLog.prototype, "fat_g", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], MealLog.prototype, "fiber_g", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['breakfast', 'lunch', 'dinner', 'snack'],
        default: 'snack',
    }),
    __metadata("design:type", String)
], MealLog.prototype, "meal_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], MealLog.prototype, "image_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: () => new Date() }),
    __metadata("design:type", Date)
], MealLog.prototype, "logged_at", void 0);
exports.MealLog = MealLog = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'nutrition_meal_logs' })
], MealLog);
exports.MealLogSchema = mongoose_1.SchemaFactory.createForClass(MealLog);
let WaterLog = class WaterLog {
};
exports.WaterLog = WaterLog;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], WaterLog.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], WaterLog.prototype, "amount_ml", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: () => new Date() }),
    __metadata("design:type", Date)
], WaterLog.prototype, "logged_at", void 0);
exports.WaterLog = WaterLog = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'nutrition_water_logs' })
], WaterLog);
exports.WaterLogSchema = mongoose_1.SchemaFactory.createForClass(WaterLog);
let ExerciseLog = class ExerciseLog {
};
exports.ExerciseLog = ExerciseLog;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ExerciseLog.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ExerciseLog.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ExerciseLog.prototype, "duration_minutes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ExerciseLog.prototype, "calories_burned", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], ExerciseLog.prototype, "exercise_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: () => new Date() }),
    __metadata("design:type", Date)
], ExerciseLog.prototype, "logged_at", void 0);
exports.ExerciseLog = ExerciseLog = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'nutrition_exercise_logs' })
], ExerciseLog);
exports.ExerciseLogSchema = mongoose_1.SchemaFactory.createForClass(ExerciseLog);
//# sourceMappingURL=nutrition.schema.js.map