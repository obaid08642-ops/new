import { IsArray, IsBoolean, IsDefined, IsEnum, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { ProviderType } from '../../common/enums';

export class AdminCreateDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  auto_approve?: boolean;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsOptional()
  @IsString()
  name_en?: string;

  @IsOptional()
  @IsNumber()
  license_number?: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsObject()
  location?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsNumber()
  years_experience?: number;

  @IsOptional()
  @IsArray()
  consultation_modes?: unknown[];


  @IsOptional()
  @IsNumber()
  price_clinic?: number;

  @IsOptional()
  @IsNumber()
  price_online?: number;

  @IsOptional()
  @IsNumber()
  price_home?: number;

  @IsOptional()
  @IsString()
  pharmacy_chain?: string;

  @IsOptional()
  @IsBoolean()
  has_own_drivers?: boolean;

  @IsOptional()
  @IsArray()
  working_hours?: unknown[];


}

export class RejectDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
export class SuspendDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
