import { IsString, IsNumber, IsOptional, IsDateString, IsBoolean, IsArray, IsObject, IsNotEmpty } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  title_ar: string;

  @IsString()
  @IsNotEmpty()
  title_en: string;

  @IsNumber()
  original_price: number;

  @IsNumber()
  discounted_price: number;

  @IsDateString()
  @IsOptional()
  start_date?: string;

  @IsDateString()
  @IsOptional()
  end_date?: string;

  @IsString()
  @IsOptional()
  image_url?: string;

  @IsObject()
  @IsOptional()
  target_parameters?: Record<string, any>;
}

export class CreateReferralDto {
  @IsString()
  @IsNotEmpty()
  patient_id: string;

  @IsString()
  @IsNotEmpty()
  target_type: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsOptional()
  requested_tests?: string[];
}

export class UpdateCrmTagDto {
  @IsBoolean()
  @IsOptional()
  is_vip?: boolean;

  @IsBoolean()
  @IsOptional()
  is_favorite?: boolean;

  @IsBoolean()
  @IsOptional()
  is_blocked?: boolean;

  @IsString()
  @IsOptional()
  blocked_reason?: string;

  @IsArray()
  @IsOptional()
  custom_tags?: string[];

  @IsArray()
  @IsOptional()
  private_notes?: any[];
}

export class CreateStaffAccountDto {
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsArray()
  @IsOptional()
  permissions?: string[];
}

export class HomeCareCheckinDto {
  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lng?: number;
}

export class HomeCareSubmitReportDto {
  @IsArray()
  @IsOptional()
  completed_tasks?: string[];

  @IsObject()
  @IsOptional()
  vitals_logged?: Record<string, any>;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class RadiologyUploadReportDto {
  @IsString()
  @IsNotEmpty()
  report_text: string;

  @IsString()
  @IsOptional()
  file_id?: string;
}
