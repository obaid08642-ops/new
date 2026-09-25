import { IsArray, IsBoolean, IsDefined, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateDto {
  @IsOptional()
  @IsString()
  blood_type?: string;

  @IsOptional()
  @IsNumber()
  height_cm?: number;

  @IsOptional()
  @IsNumber()
  weight_kg?: number;

  @IsOptional()
  @IsString()
  birth_date?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsBoolean()
  is_pregnant?: boolean;

  @IsOptional()
  @IsNumber()
  pregnancy_weeks?: number;

  @IsOptional()
  @IsBoolean()
  is_breastfeeding?: boolean;

  @IsOptional()
  @IsBoolean()
  is_smoker?: boolean;

  @IsOptional()
  @IsBoolean()
  drinks_alcohol?: boolean;

  @IsOptional()
  @IsArray()
  chronic_diseases?: unknown[];

  @IsOptional()
  @IsArray()
  allergies?: unknown[];

  @IsOptional()
  @IsArray()
  surgeries?: unknown[];

  @IsOptional()
  @IsArray()
  long_term_medications?: unknown[];

  @IsOptional()
  @IsString()
  family_history?: string;

  @IsOptional()
  @IsArray()
  dependents?: unknown[];

  @IsOptional()
  @IsObject()
  emergency_contact?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddItemDto {
  @IsDefined()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsOptional()
  @IsString()
  name_en?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  diagnosed_at?: string;
}
