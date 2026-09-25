import { IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateSubAdminDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  password: string;

  @IsOptional()
  @IsObject()
  permissions?: Record<string, unknown>;


  @IsOptional()
  @IsString()
  phone?: string;

}

export class UpdateSubAdminDto {
  @IsOptional()
  @IsObject()
  permissions?: Record<string, unknown>;


  @IsOptional()
  @IsBoolean()
  active?: boolean;

}

export class CreateProviderDto {
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsNumber()
  license_number?: number;

  @IsOptional()
  @IsString()
  city?: string;

}

export class CleanupOrphansDto {
  @IsOptional()
  @IsBoolean()
  dry_run?: boolean;

}
