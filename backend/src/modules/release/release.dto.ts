import { IsArray, IsDefined, IsEnum, IsOptional, IsNumber, IsString, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReleaseDto {
  @IsDefined()
  @IsString()
  version: string;

  @IsDefined()
  @IsEnum(['patient-app', 'provider-app', 'patient-web', 'admin'])
  app: 'patient-app' | 'provider-app' | 'patient-web' | 'admin';

  @IsDefined()
  @IsEnum(['internal', 'beta', 'production'])
  channel: 'internal' | 'beta' | 'production';

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  build_metadata?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  @Max(100, { each: true })
  rollout_percentage?: number[];
}
