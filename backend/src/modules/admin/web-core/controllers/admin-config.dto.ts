import { IsDefined, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

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

/** Orders console settings: the goodwill compensation cap and when an in-flight order counts as stuck (issue 1236). */
export class OrdersConsoleConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  compensation_max_sar?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  stuck_minutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
