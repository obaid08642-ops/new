import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { Permission } from '../../common/permissions';

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

  // The controller stores a list of Permission names (it filtered an "object" to nothing).
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(64)
  @IsIn(Object.values(Permission), { each: true })
  permissions?: Permission[];


  @IsOptional()
  @IsString()
  phone?: string;

}

export class UpdateSubAdminDto {
  // The controller stores a list of Permission names (it filtered an "object" to nothing).
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(64)
  @IsIn(Object.values(Permission), { each: true })
  permissions?: Permission[];


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

export class RejectDeltaDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
