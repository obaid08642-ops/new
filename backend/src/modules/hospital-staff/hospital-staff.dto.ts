import { IsDefined, IsOptional, IsString } from 'class-validator';

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
  department?: any;

  @IsOptional()
  permissions?: any;

  @IsOptional()
  schedule?: any;

  @IsOptional()
  specialty?: any;

  @IsOptional()
  degree?: any;

  @IsOptional()
  years_experience?: any;

  @IsOptional()
  license_number?: any;

  @IsOptional()
  consultation_fee?: any;

}

export class UpdateDto {
  @IsOptional()
  full_name?: any;

  @IsOptional()
  phone?: any;

  @IsOptional()
  email?: any;

  @IsOptional()
  department?: any;

  @IsOptional()
  permissions?: any;

  @IsOptional()
  schedule?: any;

  @IsOptional()
  specialty?: any;

  @IsOptional()
  degree?: any;

  @IsOptional()
  years_experience?: any;

  @IsOptional()
  license_number?: any;

  @IsOptional()
  consultation_fee?: any;

}
