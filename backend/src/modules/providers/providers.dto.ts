import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';

export class ApplyDto {
  @IsDefined()
  @IsString()
  full_name: string;

  @IsDefined()
  @IsString()
  phone: string;

  @IsDefined()
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  email?: string;

  type: any;

  @IsDefined()
  @IsString()
  name_ar: string;

  @IsOptional()
  @IsString()
  name_en?: string;

  @IsOptional()
  @IsString()
  license_number?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsBoolean()
  has_own_drivers?: boolean;

  @IsOptional()
  specialty?: any;

  @IsOptional()
  years_experience?: any;

  @IsOptional()
  consultation_modes?: any;

  @IsOptional()
  price_clinic?: any;

  @IsOptional()
  price_online?: any;

  @IsOptional()
  pharmacy_chain?: any;
}

export class AdminCreateDto {
  @IsOptional()
  phone?: any;

  password?: any;

  @IsOptional()
  type?: any;

  auto_approve?: any;

  @IsOptional()
  full_name?: any;

  @IsOptional()
  email?: any;

  @IsOptional()
  name_ar?: any;

  @IsOptional()
  name_en?: any;

  @IsOptional()
  license_number?: any;

  @IsOptional()
  city?: any;

  @IsOptional()
  district?: any;

  @IsOptional()
  location?: any;

  @IsOptional()
  specialty?: any;

  @IsOptional()
  years_experience?: any;

  @IsOptional()
  consultation_modes?: any;

  @IsOptional()
  price_clinic?: any;

  @IsOptional()
  price_online?: any;

  @IsOptional()
  price_home?: any;

  @IsOptional()
  pharmacy_chain?: any;

  @IsOptional()
  has_own_drivers?: any;

  @IsOptional()
  working_hours?: any;

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
