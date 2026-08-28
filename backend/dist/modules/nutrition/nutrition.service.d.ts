import { MealLog, WaterLog, ExerciseLog } from '../../schemas/nutrition.schema';
import { NutritionProfileRepository } from "./repositories/nutritionprofile.repository";
import { MealLogRepository } from "./repositories/meallog.repository";
import { WaterLogRepository } from "./repositories/waterlog.repository";
import { ExerciseLogRepository } from "./repositories/exerciselog.repository";
export declare class NutritionService {
    private readonly profileModel;
    private readonly mealModel;
    private readonly waterModel;
    private readonly exerciseModel;
    constructor(profileModel: NutritionProfileRepository, mealModel: MealLogRepository, waterModel: WaterLogRepository, exerciseModel: ExerciseLogRepository);
    private dayRange;
    calculateBMI(height_cm?: number, weight_kg?: number): number | null;
    private numberInRange;
    private safeStringList;
    private safeLoggedAt;
    getProfile(userId: string): Promise<any>;
    updateProfile(userId: string, data: any): Promise<any>;
    logMeal(userId: string, data: any): Promise<MealLog>;
    getMealHistory(userId: string, dateStr?: string): Promise<MealLog[]>;
    logWater(userId: string, amount_ml: number): Promise<WaterLog>;
    getWaterHistory(userId: string, dateStr?: string): Promise<WaterLog[]>;
    logExercise(userId: string, data: any): Promise<ExerciseLog>;
    getExerciseHistory(userId: string, dateStr?: string): Promise<ExerciseLog[]>;
    getDailySummary(userId: string, dateStr?: string): Promise<{
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
    getWeeklyReport(userId: string): Promise<{
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
