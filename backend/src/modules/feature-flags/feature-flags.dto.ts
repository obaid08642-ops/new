import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';

export class SetFeatureFlagDto {
  @IsDefined()
  @IsBoolean()
  enabled: boolean;
}
