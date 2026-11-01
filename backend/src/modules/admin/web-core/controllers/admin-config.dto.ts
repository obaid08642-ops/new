import { IsDefined, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SlaDto {
  /** Minutes a consultation lasts (1 to 240). */
  @IsDefined()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1)
  @Max(240)
  consultationDuration: number;

  /** Seconds a call rings before it is missed (10 to 300). */
  @IsDefined()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(10)
  @Max(300)
  callRingingDuration: number;

  /** Hours a session token lives (1 to 168, one week). */
  @IsDefined()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1)
  @Max(168)
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
