import { IsDefined, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

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

  @IsOptional()
  @IsString()
  reason?: string;
}
