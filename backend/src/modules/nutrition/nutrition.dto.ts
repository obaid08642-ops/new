import { IsArray, IsDateString, IsDefined, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsIn(['weight_loss', 'muscle_gain', 'healthy_lifestyle', 'maintain'])
  goal?: string;

  @IsOptional()
  @IsNumber()
  height_cm?: number;

  @IsOptional()
  @IsNumber()
  weight_kg?: number;

  @IsOptional()
  @IsNumber()
  target_weight_kg?: number;

  @IsOptional()
  @IsNumber()
  body_fat_percent?: number;

  @IsOptional()
  @IsNumber()
  daily_calorie_target?: number;

  @IsOptional()
  @IsNumber()
  daily_water_target_ml?: number;

  @IsOptional()
  @IsIn(['sedentary', 'light', 'moderate', 'active', 'very_active'])
  activity_level?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietary_restrictions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];
}

export class LogMealDto {
  @IsDefined()
  @IsString()
  name: string;

  @IsOptional()
  @IsIn(['breakfast', 'lunch', 'dinner', 'snack'])
  meal_type?: string;

  @IsOptional()
  @IsNumber()
  calories?: number;

  @IsOptional()
  @IsNumber()
  protein_g?: number;

  @IsOptional()
  @IsNumber()
  carbs_g?: number;

  @IsOptional()
  @IsNumber()
  fat_g?: number;

  @IsOptional()
  @IsNumber()
  fiber_g?: number;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsDateString()
  logged_at?: string;
}

export class LogExerciseDto {
  @IsDefined()
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  duration_minutes?: number;

  @IsOptional()
  @IsNumber()
  calories_burned?: number;

  @IsOptional()
  @IsString()
  exercise_type?: string;

  @IsOptional()
  @IsDateString()
  logged_at?: string;
}

export class LogWaterDto {
  @IsDefined()
  @IsNumber()
  amount_ml: number;
}
