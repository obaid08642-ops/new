import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/* ───────── Nutrition Profile ───────── */
@Schema({ timestamps: true, collection: 'nutrition_profiles' })
export class NutritionProfile {
  @Prop({ required: true, index: true }) patient_id: string;

  @Prop({
    type: String,
    enum: ['weight_loss', 'muscle_gain', 'healthy_lifestyle', 'maintain'],
    default: 'healthy_lifestyle',
  })
  goal: string;

  @Prop({ default: 0 }) height_cm: number;
  @Prop({ default: 0 }) weight_kg: number;
  @Prop({ default: 0 }) target_weight_kg: number;
  @Prop({ default: 0 }) bmi: number;
  @Prop({ default: 0 }) body_fat_percent: number;
  @Prop({ default: 2000 }) daily_calorie_target: number;
  @Prop({ default: 2000 }) daily_water_target_ml: number;

  @Prop({
    type: String,
    enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
    default: 'moderate',
  })
  activity_level: string;

  @Prop({ type: [String], default: [] }) dietary_restrictions: string[];
  @Prop({ type: [String], default: [] }) allergies: string[];
}

export type NutritionProfileDocument = NutritionProfile & Document;
export const NutritionProfileSchema = SchemaFactory.createForClass(NutritionProfile);

/* ───────── Meal Log ───────── */
@Schema({ timestamps: true, collection: 'nutrition_meal_logs' })
export class MealLog {
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true }) name: string;
  @Prop({ default: 0 }) calories: number;
  @Prop({ default: 0 }) protein_g: number;
  @Prop({ default: 0 }) carbs_g: number;
  @Prop({ default: 0 }) fat_g: number;
  @Prop({ default: 0 }) fiber_g: number;

  @Prop({
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    default: 'snack',
  })
  meal_type: string;

  @Prop({ default: '' }) image_url: string;
  @Prop({ default: () => new Date() }) logged_at: Date;
}

export type MealLogDocument = MealLog & Document;
export const MealLogSchema = SchemaFactory.createForClass(MealLog);

/* ───────── Water Log ───────── */
@Schema({ timestamps: true, collection: 'nutrition_water_logs' })
export class WaterLog {
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true }) amount_ml: number;
  @Prop({ default: () => new Date() }) logged_at: Date;
}

export type WaterLogDocument = WaterLog & Document;
export const WaterLogSchema = SchemaFactory.createForClass(WaterLog);

/* ───────── Exercise Log ───────── */
@Schema({ timestamps: true, collection: 'nutrition_exercise_logs' })
export class ExerciseLog {
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true }) name: string;
  @Prop({ default: 0 }) duration_minutes: number;
  @Prop({ default: 0 }) calories_burned: number;
  @Prop({ default: '' }) exercise_type: string;
  @Prop({ default: () => new Date() }) logged_at: Date;
}

export type ExerciseLogDocument = ExerciseLog & Document;
export const ExerciseLogSchema = SchemaFactory.createForClass(ExerciseLog);
