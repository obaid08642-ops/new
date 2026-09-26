import { IsBoolean, IsDefined } from 'class-validator';

export class SetFeatureFlagDto {
  @IsDefined()
  @IsBoolean()
  enabled: boolean;
}
