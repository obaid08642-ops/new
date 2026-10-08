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

export class PromoteBetaDto {
  @IsDefined()
  @IsEnum(['ios', 'android'])
  platform: 'ios' | 'android';

  // TestFlight (iOS)
  @IsOptional()
  @IsString()
  testflight_build_number?: string;

  @IsOptional()
  @IsEnum(['internal', 'external'])
  testflight_group?: 'internal' | 'external';

  // Play (Android)
  @IsOptional()
  @IsEnum(['internal', 'closed'])
  play_track?: 'internal' | 'closed';

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1)
  play_rollout_fraction?: number;

  @IsOptional()
  @IsString()
  promoted_by?: string;
}

export class PromoteProductionDto {
  // Observed health at promotion time; recorded onto the version, then gated.
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  crash_free_rate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  anr_rate?: number;

  @IsOptional()
  @IsString()
  promoted_by?: string;
}

export class RecordVersionHealthDto {
  @IsDefined()
  @IsNumber()
  @Min(0)
  @Max(100)
  crash_free_rate: number;

  @IsDefined()
  @IsNumber()
  @Min(0)
  @Max(100)
  anr_rate: number;
}

export class SubmitReviewReplyDto {
  @IsDefined()
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  app?: string;

  @IsOptional()
  @IsEnum(['ios', 'android'])
  platform?: 'ios' | 'android';
}
