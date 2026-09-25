import { IsArray, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDto {
  @IsDefined()
  @IsString()
  full_name: string;

  @IsDefined()
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsDefined()
  @IsString()
  password: string;

  @IsDefined()
  @IsString()
  staff_role: string;

  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsOptional()
  @IsString()
  name_en?: string;

  @IsOptional()
  @IsString()
  legal_name?: string;

  @IsOptional()
  @IsString()
  scfhs?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  schedule?: unknown;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  degree?: string;

  @IsOptional()
  @IsNumber()
  years_experience?: number;

  @IsOptional()
  @IsString()
  license_number?: string;

  @IsOptional()
  @IsNumber()
  consultation_fee?: number;


}

export class UpdateDto {
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  schedule?: unknown;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  degree?: string;

  @IsOptional()
  @IsNumber()
  years_experience?: number;

  @IsOptional()
  @IsString()
  license_number?: string;

  @IsOptional()
  @IsNumber()
  consultation_fee?: number;
}
