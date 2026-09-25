import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateSubAdminDto {
  @IsOptional()
  email?: any;

  @IsOptional()
  full_name?: any;

  @IsOptional()
  @IsString()
  password: string;

  @IsOptional()
  @IsObject()
  permissions?: Record<string, unknown>;


  @IsOptional()
  phone?: any;

}

export class UpdateSubAdminDto {
  @IsOptional()
  @IsObject()
  permissions?: Record<string, unknown>;


  @IsOptional()
  active?: any;

}

export class CreateProviderDto {
  @IsOptional()
  role?: any;

  @IsOptional()
  full_name?: any;

  @IsOptional()
  email?: any;

  @IsOptional()
  phone?: any;

  @IsOptional()
  @IsString()
  password: string;

  @IsOptional()
  specialty?: any;

  @IsOptional()
  license_number?: any;

  @IsOptional()
  city?: any;

}

export class CleanupOrphansDto {
  @IsOptional()
  dry_run?: any;

}
