import { IsDefined, IsNumber, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  is_pregnant?: any;

  @IsOptional()
  due_date?: any;

  @IsOptional()
  lmp_date?: any;

  last_period_date?: any;

  @IsOptional()
  cycle_length?: any;

  @IsOptional()
  prev_period_date?: any;

  @IsOptional()
  is_regular?: any;

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
