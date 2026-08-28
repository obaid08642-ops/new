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
exports.NutritionService = void 0;
const common_1 = require("@nestjs/common");
const nutritionprofile_repository_1 = require("./repositories/nutritionprofile.repository");
const meallog_repository_1 = require("./repositories/meallog.repository");
const waterlog_repository_1 = require("./repositories/waterlog.repository");
const exerciselog_repository_1 = require("./repositories/exerciselog.repository");
let NutritionService = class NutritionService {
    constructor(profileModel, mealModel, waterModel, exerciseModel) {
        this.profileModel = profileModel;
        this.mealModel = mealModel;
        this.waterModel = waterModel;
        this.exerciseModel = exerciseModel;
    }
    dayRange(dateStr) {
        const base = dateStr ? new Date(dateStr) : new Date();
        const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
        const end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59, 999);
        return { start, end };
    }
    calculateBMI(height_cm, weight_kg) {
        if (!height_cm || !weight_kg || height_cm <= 0 || weight_kg <= 0)
            return null;
        const heightM = height_cm / 100;
        return Math.round((weight_kg / (heightM * heightM)) * 10) / 10;
    }
    numberInRange(value, field, min, max, integer = false) {
        const number = Number(value);
        if (!Number.isFinite(number) || number < min || number > max || (integer && !Number.isInteger(number))) {
            throw new common_1.BadRequestException(`${field} must be ${integer ? 'an integer ' : ''}between ${min} and ${max}`);
        }
        return number;
    }
    safeStringList(value, field) {
        if (!Array.isArray(value) || value.length > 30 || value.some((item) => typeof item !== 'string' || item.trim().length > 100)) {
            throw new common_1.BadRequestException(`${field} must be a list of up to 30 short strings`);
        }
        return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
    }
    safeLoggedAt(value) {
        const at = value ? new Date(String(value)) : new Date();
        if (Number.isNaN(at.getTime()) || at.getTime() > Date.now() + 5 * 60 * 1000 || at.getTime() < Date.now() - 31 * 24 * 60 * 60 * 1000) {
            throw new common_1.BadRequestException('logged_at must be within the last 31 days');
        }
        return at;
    }
    async getProfile(userId) {
        const profile = await this.profileModel.findOne({ patient_id: userId });
        return profile ? profile.toObject() : { patient_id: userId, profile_ready: false };
    }
    async updateProfile(userId, data) {
        let profile = await this.profileModel.findOne({ patient_id: userId });
        const fields = {};
        const allowedGoals = ['weight_loss', 'muscle_gain', 'healthy_lifestyle', 'maintain'];
        const allowedActivity = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
        if (data.goal !== undefined) {
            if (!allowedGoals.includes(data.goal))
                throw new common_1.BadRequestException('invalid nutrition goal');
            fields.goal = data.goal;
        }
        if (data.height_cm !== undefined)
            fields.height_cm = this.numberInRange(data.height_cm, 'height_cm', 50, 260, false);
        if (data.weight_kg !== undefined)
            fields.weight_kg = this.numberInRange(data.weight_kg, 'weight_kg', 15, 500, false);
        if (data.target_weight_kg !== undefined)
            fields.target_weight_kg = this.numberInRange(data.target_weight_kg, 'target_weight_kg', 15, 500, false);
        if (data.body_fat_percent !== undefined)
            fields.body_fat_percent = this.numberInRange(data.body_fat_percent, 'body_fat_percent', 0, 100, false);
        if (data.daily_calorie_target !== undefined)
            fields.daily_calorie_target = this.numberInRange(data.daily_calorie_target, 'daily_calorie_target', 500, 10000, true);
        if (data.daily_water_target_ml !== undefined)
            fields.daily_water_target_ml = this.numberInRange(data.daily_water_target_ml, 'daily_water_target_ml', 250, 10000, true);
        if (data.activity_level !== undefined) {
            if (!allowedActivity.includes(data.activity_level))
                throw new common_1.BadRequestException('invalid activity_level');
            fields.activity_level = data.activity_level;
        }
        if (data.dietary_restrictions !== undefined)
            fields.dietary_restrictions = this.safeStringList(data.dietary_restrictions, 'dietary_restrictions');
        if (data.allergies !== undefined)
            fields.allergies = this.safeStringList(data.allergies, 'allergies');
        const height = fields.height_cm ?? profile?.height_cm;
        const weight = fields.weight_kg ?? profile?.weight_kg;
        const bmi = this.calculateBMI(height, weight);
        if (bmi !== null)
            fields.bmi = bmi;
        if (profile) {
            Object.assign(profile, fields);
            await profile.save();
        }
        else {
            profile = await this.profileModel.create({ patient_id: userId, ...fields });
        }
        return { ...profile.toObject(), profile_ready: Boolean(profile.goal && profile.daily_calorie_target && profile.daily_water_target_ml) };
    }
    async logMeal(userId, data) {
        const name = typeof data?.name === 'string' ? data.name.trim() : '';
        if (!name || name.length > 200)
            throw new common_1.BadRequestException('meal name is required and must be at most 200 characters');
        const mealType = data?.meal_type ?? 'snack';
        if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType))
            throw new common_1.BadRequestException('invalid meal_type');
        const meal = await this.mealModel.create({
            patient_id: userId,
            name,
            calories: this.numberInRange(data?.calories, 'calories', 0, 10000, false),
            protein_g: data?.protein_g === undefined ? 0 : this.numberInRange(data.protein_g, 'protein_g', 0, 2000, false),
            carbs_g: data?.carbs_g === undefined ? 0 : this.numberInRange(data.carbs_g, 'carbs_g', 0, 2000, false),
            fat_g: data?.fat_g === undefined ? 0 : this.numberInRange(data.fat_g, 'fat_g', 0, 2000, false),
            fiber_g: data?.fiber_g === undefined ? 0 : this.numberInRange(data.fiber_g, 'fiber_g', 0, 1000, false),
            meal_type: mealType,
            image_url: typeof data?.image_url === 'string' && data.image_url.length <= 2000 ? data.image_url : '',
            logged_at: this.safeLoggedAt(data?.logged_at),
        });
        return meal.toObject();
    }
    async getMealHistory(userId, dateStr) {
        const filter = { patient_id: userId };
        if (dateStr) {
            const { start, end } = this.dayRange(dateStr);
            filter.logged_at = { $gte: start, $lte: end };
        }
        const meals = await this.mealModel.find(filter).sort({ logged_at: -1 }).lean();
        return meals;
    }
    async logWater(userId, amount_ml) {
        const log = await this.waterModel.create({
            patient_id: userId,
            amount_ml: this.numberInRange(amount_ml, 'amount_ml', 50, 3000, true),
            logged_at: new Date(),
        });
        return log.toObject();
    }
    async getWaterHistory(userId, dateStr) {
        const filter = { patient_id: userId };
        if (dateStr) {
            const { start, end } = this.dayRange(dateStr);
            filter.logged_at = { $gte: start, $lte: end };
        }
        const logs = await this.waterModel.find(filter).sort({ logged_at: -1 }).lean();
        return logs;
    }
    async logExercise(userId, data) {
        const name = typeof data?.name === 'string' ? data.name.trim() : '';
        if (!name || name.length > 200)
            throw new common_1.BadRequestException('exercise name is required and must be at most 200 characters');
        const log = await this.exerciseModel.create({
            patient_id: userId,
            name,
            duration_minutes: this.numberInRange(data?.duration_minutes, 'duration_minutes', 1, 1440, true),
            calories_burned: data?.calories_burned === undefined ? 0 : this.numberInRange(data.calories_burned, 'calories_burned', 0, 10000, false),
            exercise_type: typeof data?.exercise_type === 'string' && data.exercise_type.length <= 100 ? data.exercise_type.trim() : '',
            logged_at: this.safeLoggedAt(data?.logged_at),
        });
        return log.toObject();
    }
    async getExerciseHistory(userId, dateStr) {
        const filter = { patient_id: userId };
        if (dateStr) {
            const { start, end } = this.dayRange(dateStr);
            filter.logged_at = { $gte: start, $lte: end };
        }
        const logs = await this.exerciseModel.find(filter).sort({ logged_at: -1 }).lean();
        return logs;
    }
    async getDailySummary(userId, dateStr) {
        const { start, end } = this.dayRange(dateStr);
        const dateFilter = { patient_id: userId, logged_at: { $gte: start, $lte: end } };
        const [meals, waterLogs, exercises, profile] = await Promise.all([
            this.mealModel.find(dateFilter).lean(),
            this.waterModel.find(dateFilter).lean(),
            this.exerciseModel.find(dateFilter).lean(),
            this.profileModel.findOne({ patient_id: userId }).lean(),
        ]);
        const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
        const totalProtein = meals.reduce((sum, m) => sum + (m.protein_g || 0), 0);
        const totalCarbs = meals.reduce((sum, m) => sum + (m.carbs_g || 0), 0);
        const totalFat = meals.reduce((sum, m) => sum + (m.fat_g || 0), 0);
        const totalFiber = meals.reduce((sum, m) => sum + (m.fiber_g || 0), 0);
        const totalWater = waterLogs.reduce((sum, w) => sum + (w.amount_ml || 0), 0);
        const totalCaloriesBurned = exercises.reduce((sum, e) => sum + (e.calories_burned || 0), 0);
        const totalExerciseMinutes = exercises.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
        return {
            date: start.toISOString().split('T')[0],
            calories: {
                consumed: totalCalories,
                burned: totalCaloriesBurned,
                target: profile?.daily_calorie_target ?? null,
                net: totalCalories - totalCaloriesBurned,
            },
            macros: {
                protein_g: totalProtein,
                carbs_g: totalCarbs,
                fat_g: totalFat,
                fiber_g: totalFiber,
            },
            water: {
                consumed_ml: totalWater,
                target_ml: profile?.daily_water_target_ml ?? null,
            },
            exercise: {
                total_minutes: totalExerciseMinutes,
                calories_burned: totalCaloriesBurned,
                sessions: exercises.length,
            },
            meals_count: meals.length,
        };
    }
    async getWeeklyReport(userId) {
        const today = new Date();
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const summary = await this.getDailySummary(userId, dateStr);
            days.push(summary);
        }
        const totals = days.reduce((acc, day) => {
            acc.calories_consumed += day.calories.consumed;
            acc.calories_burned += day.calories.burned;
            acc.water_ml += day.water.consumed_ml;
            acc.exercise_minutes += day.exercise.total_minutes;
            acc.meals_count += day.meals_count;
            return acc;
        }, { calories_consumed: 0, calories_burned: 0, water_ml: 0, exercise_minutes: 0, meals_count: 0 });
        return {
            period: {
                from: days[0]?.date,
                to: days[days.length - 1]?.date,
            },
            daily: days,
            averages: {
                calories_consumed: Math.round(totals.calories_consumed / 7),
                calories_burned: Math.round(totals.calories_burned / 7),
                water_ml: Math.round(totals.water_ml / 7),
                exercise_minutes: Math.round(totals.exercise_minutes / 7),
            },
            totals,
        };
    }
};
exports.NutritionService = NutritionService;
exports.NutritionService = NutritionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('NutritionProfileRepository')),
    __param(1, (0, common_1.Inject)('MealLogRepository')),
    __param(2, (0, common_1.Inject)('WaterLogRepository')),
    __param(3, (0, common_1.Inject)('ExerciseLogRepository')),
    __metadata("design:paramtypes", [nutritionprofile_repository_1.NutritionProfileRepository,
        meallog_repository_1.MealLogRepository,
        waterlog_repository_1.WaterLogRepository,
        exerciselog_repository_1.ExerciseLogRepository])
], NutritionService);
//# sourceMappingURL=nutrition.service.js.map