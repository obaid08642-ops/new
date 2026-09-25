import { IsDefined, IsNumber, IsObject, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  goal?: any;

  @IsOptional()
  height_cm?: any;

  @IsOptional()
  weight_kg?: any;

  @IsOptional()
  target_weight_kg?: any;

  @IsOptional()
  body_fat_percent?: any;

  @IsOptional()
  daily_calorie_target?: any;

  @IsOptional()
  daily_water_target_ml?: any;

  @IsOptional()
  activity_level?: any;

  @IsOptional()
  dietary_restrictions?: any;

  @IsOptional()
  allergies?: any;

}

export class LogMealDto {
  @IsOptional()
  @IsObject()
  name?: Record<string, unknown>;


  @IsOptional()
  meal_type?: any;

  @IsOptional()
  calories?: any;

  @IsOptional()
  protein_g?: any;

  @IsOptional()
  carbs_g?: any;

  @IsOptional()
  fat_g?: any;

  @IsOptional()
  fiber_g?: any;

  @IsOptional()
  @IsObject()
  image_url?: Record<string, unknown>;


  @IsOptional()
  logged_at?: any;

}

export class LogExerciseDto {
  @IsOptional()
  @IsObject()
  name?: Record<string, unknown>;


  @IsOptional()
  duration_minutes?: any;

  @IsOptional()
  calories_burned?: any;

  @IsOptional()
  @IsObject()
  exercise_type?: Record<string, unknown>;


  @IsOptional()
  logged_at?: any;

}

export class LogWaterDto {
  @IsDefined()
  @IsNumber()
  amount_ml: number;
}
