import { IsArray, IsBoolean, IsDefined, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class ChangePasswordDto {
  @IsDefined()
  @IsString()
  current_password: string;

  @IsDefined()
  @IsString()
  new_password: string;

  @IsOptional()
  @IsString()
  device_identifier?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  display_name_ar?: string;

  @IsOptional()
  @IsString()
  display_name_en?: string;

  @IsOptional()
  @IsString()
  legal_name?: string;

  @IsOptional()
  @IsString()
  description_ar?: string;

  @IsOptional()
  @IsString()
  description_en?: string;

  @IsOptional()
  @IsString()
  commercial_registration_number?: string;

  @IsOptional()
  @IsString()
  tax_number?: string;

  @IsOptional()
  @IsString()
  medical_license_number?: string;

  @IsOptional()
  @IsString()
  facility_license_number?: string;

  @IsOptional()
  @IsNumber()
  established_year?: number;

  @IsOptional()
  @IsNumber()
  years_of_experience?: number;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsObject()
  social?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  geo?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  has_own_delivery?: boolean;

  @IsOptional()
  @IsBoolean()
  use_platform_delivery?: boolean;

  @IsOptional()
  @IsNumber()
  delivery_fee?: number;

  @IsOptional()
  @IsNumber()
  estimated_delivery_minutes?: number;

  @IsOptional()
  @IsString()
  profile_image_id?: string;

  @IsOptional()
  @IsString()
  cover_image_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clinic_images?: string[];

  @IsOptional()
  @IsBoolean()
  public_eligibility?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabled_modules?: string[];

  @IsOptional()
  @IsString()
  delivery_mode?: string;

  @IsOptional()
  @IsNumber()
  max_delivery_radius_km?: number;

  @IsOptional()
  @IsNumber()
  estimated_delivery_time?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sub_specialties?: string[];

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  degree?: string;

  @IsOptional()
  @IsString()
  contact_phone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coverage_cities?: string[];
}

export class InsuranceCopayDto {
  @IsOptional()
  @IsString()
  approvalStatus?: string;

  @IsOptional()
  @IsNumber()
  patientCopay?: number;

  @IsOptional()
  @IsString()
  approvalCode?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class SeedUnassignedDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsObject()
  patient?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  summary_ar?: string;

  @IsOptional()
  @IsString()
  summary_en?: string;

  @IsOptional()
  @IsNumber()
  amount_total?: number;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  scheduled_at?: string;

  @IsOptional()
  @IsObject()
  patient_location?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  strategy?: string;
}
