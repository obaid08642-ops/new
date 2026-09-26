import { IsArray, IsBoolean, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class SaveHomeCurationDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsDefined()
  @IsArray()
  sections: any[];

}

export class SaveFeatureFlagDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsNumber()
  rollout_percentage?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

}
