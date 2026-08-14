import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import {
  NutritionProfile,
  NutritionProfileDocument,
  MealLog,
  MealLogDocument,
  WaterLog,
  WaterLogDocument,
  ExerciseLog,
  ExerciseLogDocument,
} from '../../schemas/nutrition.schema';
import { NutritionProfileRepository } from "./repositories/nutritionprofile.repository";
import { MealLogRepository } from "./repositories/meallog.repository";
import { WaterLogRepository } from "./repositories/waterlog.repository";
import { ExerciseLogRepository } from "./repositories/exerciselog.repository";

@Injectable()
export class NutritionService {
  constructor(
    @Inject('NutritionProfileRepository') private readonly profileModel: NutritionProfileRepository,
    @Inject('MealLogRepository') private readonly mealModel: MealLogRepository,
    @Inject('WaterLogRepository') private readonly waterModel: WaterLogRepository,
    @Inject('ExerciseLogRepository') private readonly exerciseModel: ExerciseLogRepository,
  ) {}

  /* ───────── Helpers ───────── */

  /** Build start/end-of-day range for a given date string (YYYY-MM-DD) or today */
  private dayRange(dateStr?: string): { start: Date; end: Date } {
    const base = dateStr ? new Date(dateStr) : new Date();
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
    const end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59, 999);
    return { start, end };
  }

  /** BMI = weight (kg) / height (m)² */
  calculateBMI(height_cm: number, weight_kg: number): number {
    if (!height_cm || height_cm <= 0) return 0;
    const heightM = height_cm / 100;
    return Math.round((weight_kg / (heightM * heightM)) * 10) / 10;
  }

  /* ───────── Profile ───────── */

  async getProfile(userId: string): Promise<NutritionProfile> {
    let profile = await this.profileModel.findOne({ patient_id: userId });
    if (!profile) {
      profile = await this.profileModel.create({
        patient_id: userId,
        goal: 'healthy_lifestyle',
        height_cm: 0,
        weight_kg: 0,
        target_weight_kg: 0,
        bmi: 0,
        body_fat_percent: 0,
        daily_calorie_target: 2000,
        daily_water_target_ml: 2000,
        activity_level: 'moderate',
        dietary_restrictions: [],
        allergies: [],
      });
    }
    return profile.toObject();
  }

  async updateProfile(userId: string, data: any): Promise<NutritionProfile> {
    let profile = await this.profileModel.findOne({ patient_id: userId });

    const fields: any = {};

    if (data.goal !== undefined) fields.goal = data.goal;
    if (data.height_cm !== undefined) fields.height_cm = data.height_cm;
    if (data.weight_kg !== undefined) fields.weight_kg = data.weight_kg;
    if (data.target_weight_kg !== undefined) fields.target_weight_kg = data.target_weight_kg;
    if (data.body_fat_percent !== undefined) fields.body_fat_percent = data.body_fat_percent;
    if (data.daily_calorie_target !== undefined) fields.daily_calorie_target = data.daily_calorie_target;
    if (data.daily_water_target_ml !== undefined) fields.daily_water_target_ml = data.daily_water_target_ml;
    if (data.activity_level !== undefined) fields.activity_level = data.activity_level;
    if (data.dietary_restrictions !== undefined) fields.dietary_restrictions = data.dietary_restrictions;
    if (data.allergies !== undefined) fields.allergies = data.allergies;

    // Recalculate BMI when height or weight are provided / changed
    const height = data.height_cm ?? profile?.height_cm ?? 0;
    const weight = data.weight_kg ?? profile?.weight_kg ?? 0;
    fields.bmi = this.calculateBMI(height, weight);

    if (profile) {
      Object.assign(profile, fields);
      await profile.save();
    } else {
      profile = await this.profileModel.create({
        patient_id: userId,
        ...fields,
      });
    }
    return profile.toObject();
  }

  /* ───────── Meals ───────── */

  async logMeal(userId: string, data: any): Promise<MealLog> {
    const meal = await this.mealModel.create({
      patient_id: userId,
      name: data.name,
      calories: data.calories ?? 0,
      protein_g: data.protein_g ?? 0,
      carbs_g: data.carbs_g ?? 0,
      fat_g: data.fat_g ?? 0,
      fiber_g: data.fiber_g ?? 0,
      meal_type: data.meal_type ?? 'snack',
      image_url: data.image_url ?? '',
      logged_at: data.logged_at ? new Date(data.logged_at) : new Date(),
    });
    return meal.toObject();
  }

  async getMealHistory(userId: string, dateStr?: string): Promise<MealLog[]> {
    const filter: any = { patient_id: userId };
    if (dateStr) {
      const { start, end } = this.dayRange(dateStr);
      filter.logged_at = { $gte: start, $lte: end };
    }
    const meals = await this.mealModel.find(filter).sort({ logged_at: -1 }).lean();
    return meals;
  }

  /* ───────── Water ───────── */

  async logWater(userId: string, amount_ml: number): Promise<WaterLog> {
    const log = await this.waterModel.create({
      patient_id: userId,
      amount_ml,
      logged_at: new Date(),
    });
    return log.toObject();
  }

  async getWaterHistory(userId: string, dateStr?: string): Promise<WaterLog[]> {
    const filter: any = { patient_id: userId };
    if (dateStr) {
      const { start, end } = this.dayRange(dateStr);
      filter.logged_at = { $gte: start, $lte: end };
    }
    const logs = await this.waterModel.find(filter).sort({ logged_at: -1 }).lean();
    return logs;
  }

  /* ───────── Exercise ───────── */

  async logExercise(userId: string, data: any): Promise<ExerciseLog> {
    const log = await this.exerciseModel.create({
      patient_id: userId,
      name: data.name,
      duration_minutes: data.duration_minutes ?? 0,
      calories_burned: data.calories_burned ?? 0,
      exercise_type: data.exercise_type ?? '',
      logged_at: data.logged_at ? new Date(data.logged_at) : new Date(),
    });
    return log.toObject();
  }

  async getExerciseHistory(userId: string, dateStr?: string): Promise<ExerciseLog[]> {
    const filter: any = { patient_id: userId };
    if (dateStr) {
      const { start, end } = this.dayRange(dateStr);
      filter.logged_at = { $gte: start, $lte: end };
    }
    const logs = await this.exerciseModel.find(filter).sort({ logged_at: -1 }).lean();
    return logs;
  }

  /* ───────── Daily Summary ───────── */

  async getDailySummary(userId: string, dateStr?: string) {
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
        target: profile?.daily_calorie_target ?? 2000,
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
        target_ml: profile?.daily_water_target_ml ?? 2000,
      },
      exercise: {
        total_minutes: totalExerciseMinutes,
        calories_burned: totalCaloriesBurned,
        sessions: exercises.length,
      },
      meals_count: meals.length,
    };
  }

  /* ───────── Weekly Report ───────── */

  async getWeeklyReport(userId: string) {
    const today = new Date();
    const days: any[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const summary = await this.getDailySummary(userId, dateStr);
      days.push(summary);
    }

    const totals = days.reduce(
      (acc, day) => {
        acc.calories_consumed += day.calories.consumed;
        acc.calories_burned += day.calories.burned;
        acc.water_ml += day.water.consumed_ml;
        acc.exercise_minutes += day.exercise.total_minutes;
        acc.meals_count += day.meals_count;
        return acc;
      },
      { calories_consumed: 0, calories_burned: 0, water_ml: 0, exercise_minutes: 0, meals_count: 0 },
    );

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
}
