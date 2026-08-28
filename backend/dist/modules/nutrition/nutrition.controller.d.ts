import { NutritionService } from './nutrition.service';
export declare class NutritionController {
    private readonly nutritionService;
    constructor(nutritionService: NutritionService);
    private authenticatedPatientId;
    getProfile(req: any): Promise<any>;
    updateProfile(req: any, body: any): Promise<any>;
    logMeal(req: any, body: any): Promise<import("../../schemas/nutrition.schema").MealLog>;
    getMealHistory(req: any, date?: string): Promise<import("../../schemas/nutrition.schema").MealLog[]>;
    getDailySummary(req: any, date?: string): Promise<{
        date: string;
        calories: {
            consumed: any;
            burned: any;
            target: any;
            net: number;
        };
        macros: {
            protein_g: any;
            carbs_g: any;
            fat_g: any;
            fiber_g: any;
        };
        water: {
            consumed_ml: any;
            target_ml: any;
        };
        exercise: {
            total_minutes: any;
            calories_burned: any;
            sessions: any;
        };
        meals_count: any;
    }>;
    logWater(req: any, body: {
        amount_ml: number;
    }): Promise<import("../../schemas/nutrition.schema").WaterLog>;
    getWaterHistory(req: any, date?: string): Promise<import("../../schemas/nutrition.schema").WaterLog[]>;
    logExercise(req: any, body: any): Promise<import("../../schemas/nutrition.schema").ExerciseLog>;
    getExerciseHistory(req: any, date?: string): Promise<import("../../schemas/nutrition.schema").ExerciseLog[]>;
    getWeeklyReport(req: any): Promise<{
        period: {
            from: any;
            to: any;
        };
        daily: any[];
        averages: {
            calories_consumed: number;
            calories_burned: number;
            water_ml: number;
            exercise_minutes: number;
        };
        totals: any;
    }>;
}
