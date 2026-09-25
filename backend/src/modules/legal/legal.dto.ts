import { IsArray, IsBoolean, IsDateString, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateLegalPolicyDto {
  @IsOptional() @IsString() title_ar?: string;
  @IsOptional() @IsString() title_en?: string;
  @IsOptional() @IsString() version?: string;
  @IsOptional() @IsDateString() effective_date?: string;
  @IsOptional() @IsString() content_ar?: string;
  @IsOptional() @IsString() content_en?: string;
  @IsOptional() @IsBoolean() requires_acceptance?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) applies_to?: string[];
  @IsOptional() @IsString() change_note?: string;
}

export class UpdateCommissionsDto {
  // These keyed maps are intentionally operator-configurable; consumers validate each commission at use time.
  @IsOptional() @IsObject() service_types?: Record<string, unknown>;
  @IsOptional() @IsObject() provider_overrides?: Record<string, unknown>;
  @IsOptional() @IsObject() payout_schedule?: Record<string, unknown>;
  @IsOptional() @IsObject() tax?: Record<string, unknown>;
}
