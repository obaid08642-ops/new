import { IsDefined, IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

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
