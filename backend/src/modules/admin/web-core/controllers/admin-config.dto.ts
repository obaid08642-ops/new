import { IsNumber, IsObject, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class DisputeConfigDto {
  @IsNumber()
  @Min(0)
  max_refund_sar: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class OrdersConsoleConfigDto {
  @IsNumber()
  @Min(0)
  compensation_max_sar: number;
}

export class SlaDto {
  @IsOptional() @IsNumber() @Min(0) consultationDuration?: number;
  @IsOptional() @IsNumber() @Min(0) callRingingDuration?: number;
  @IsOptional() @IsNumber() @Min(0) jwtExpiry?: number;
  /** config-portal asks for a reason and stores it in the audit log. */
  @IsOptional() @IsString() @MinLength(5) reason?: string;
}

export class AppVersionsDto {
  @IsOptional() @IsString() ios?: string;
  @IsOptional() @IsString() android?: string;
  @IsOptional() @IsString() force_update?: string;
  @IsOptional() @IsObject() apps?: Record<string, unknown>;
}
