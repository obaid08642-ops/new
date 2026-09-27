import { IsDefined, IsIn, IsNumber, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class SlaDto {
  @IsDefined()
  @IsNumber()
  consultationDuration: number;

  @IsDefined()
  @IsNumber()
  callRingingDuration: number;

  @IsDefined()
  @IsNumber()
  jwtExpiry: number;

  @IsOptional()
  @IsString()
  @IsIn(['online', 'degraded', 'maintenance'])
  systemStatus?: string;

  // Admin config-portal sends a change reason; it is written to the audit log.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/** P6.x-13: per-app force-update versions + maintenance flags. */
export class AppVersionsDto {
  @IsOptional()
  @IsObject()
  apps?: Record<string, { min_version?: string; latest_version?: string; maintenance?: boolean; message_ar?: string; message_en?: string }>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
