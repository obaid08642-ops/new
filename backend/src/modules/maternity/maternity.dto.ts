import { IsBoolean, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsBoolean()
  is_pregnant?: boolean;

  @IsOptional()
  @IsString()
  due_date?: string;

  @IsOptional()
  @IsString()
  lmp_date?: string;

  @IsOptional()
  @IsString()
  last_period_date?: string;

  @IsOptional()
  @IsNumber()
  cycle_length?: number;

  @IsOptional()
  @IsString()
  prev_period_date?: string;

  @IsOptional()
  @IsString()
  is_regular?: string;


}

export class LogKickDto {
  @IsDefined()
  @IsNumber()
  count: number;

  @IsDefined()
  @IsNumber()
  duration_seconds: number;
}
export class LogContractionDto {
  @IsDefined()
  @IsNumber()
  interval_seconds: number;

  @IsDefined()
  @IsNumber()
  duration_seconds: number;
}
export class LogInfantGrowthDto {
  @IsDefined()
  @IsNumber()
  month: number;

  @IsOptional()
  @IsNumber()
  weight_kg?: number;

  @IsOptional()
  @IsNumber()
  height_cm?: number;

  @IsOptional()
  @IsNumber()
  head_circ_cm?: number;
}
