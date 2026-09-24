import { IsOptional, IsString } from 'class-validator';

export class CreateSubAdminDto {
  @IsOptional()
  email?: any;

  @IsOptional()
  full_name?: any;

  @IsOptional()
  @IsString()
  password: string;

  @IsOptional()
  permissions?: any;

  @IsOptional()
  phone?: any;

}

export class UpdateSubAdminDto {
  @IsOptional()
  permissions?: any;

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
