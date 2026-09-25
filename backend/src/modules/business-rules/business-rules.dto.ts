import { IsNumber, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SurgeConfigDto {
  @IsOptional()
  @IsNumber()
  startHour?: number;

  @IsOptional()
  @IsNumber()
  endHour?: number;

  @IsOptional()
  @IsNumber()
  multiplier?: number;
}

export class UpdateSurgeDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SurgeConfigDto)
  surgeConfig?: SurgeConfigDto;

}
