import { IsArray, IsBoolean, IsDefined, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDto {
  @IsOptional()
  @IsIn(['revenue', 'commissions', 'funnels', 'cohorts', 'anomalies', 'provider_league'])
  report?: string;

  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly'])
  frequency?: string;

  @IsDefined()
  @IsArray()
  recipients: any[];

  @IsOptional()
  @IsNumber()
  hour_utc?: number;

  @IsOptional()
  @IsIn(['csv', 'json'])
  format?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

}

export class UpdateDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];

  @IsOptional()
  @IsNumber()
  hour_utc?: number;
}

export class RemoveDto {
  @IsOptional()
  @IsString()
  reason?: string;

}
