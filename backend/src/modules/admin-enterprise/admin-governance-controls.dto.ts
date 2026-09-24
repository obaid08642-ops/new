import { IsArray, IsDefined, IsOptional } from 'class-validator';

export class SaveHomeCurationDto {
  @IsOptional()
  reason?: any;

  @IsDefined()
  @IsArray()
  sections: any[];

}

export class SaveFeatureFlagDto {
  @IsOptional()
  reason?: any;

  @IsOptional()
  key?: any;

  @IsOptional()
  rollout_percentage?: any;

  @IsOptional()
  enabled?: any;

}
