import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsDefined, IsIn, IsNumber, IsObject, IsOptional, IsString, Min, Max } from 'class-validator';

// Admin loyalty routes (admin/src/pages/admin/loyalty-config.tsx). The service does the business checks (positive points, no purchase challenges, end after start);
// these classes give every field a real type check, and `@Type(() => Number)` keeps the numeric strings a form may send working as before.
export const REWARD_TYPES = ['coupon', 'cashback', 'badge', 'gift'] as const;

export class CreateRewardDto {
  @IsDefined() @IsString() title_ar: string;
  @IsDefined() @IsString() title_en: string;
  @IsDefined() @Type(() => Number) @IsNumber() points_required: number;
  @IsDefined() @IsIn([...REWARD_TYPES]) reward_type: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Number) @IsNumber() value?: number;
  @IsOptional() @IsString() image?: string;
  @IsOptional() @Type(() => Number) @IsNumber() stock?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateRewardDto {
  @IsOptional() @IsString() title_ar?: string;
  @IsOptional() @IsString() title_en?: string;
  @IsOptional() @Type(() => Number) @IsNumber() points_required?: number;
  @IsOptional() @IsIn([...REWARD_TYPES]) reward_type?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Number) @IsNumber() value?: number;
  @IsOptional() @IsString() image?: string;
  @IsOptional() @Type(() => Number) @IsNumber() stock?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateChallengeDto {
  @IsDefined() @IsString() title_ar: string;
  @IsDefined() @IsString() title_en: string;
  @IsDefined() @IsString() target_action: string;
  @IsDefined() @Type(() => Number) @IsNumber() reward_points: number;
  @IsDefined() @IsDateString() start_date: string;
  @IsDefined() @IsDateString() end_date: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Number) @IsNumber() target_count?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateChallengeDto {
  @IsOptional() @IsString() title_ar?: string;
  @IsOptional() @IsString() title_en?: string;
  @IsOptional() @IsString() target_action?: string;
  @IsOptional() @Type(() => Number) @IsNumber() reward_points?: number;
  @IsOptional() @IsDateString() start_date?: string;
  @IsOptional() @IsDateString() end_date?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Number) @IsNumber() target_count?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

/** PUT admin/loyalty/config: any subset of the settings; the service refuses negative numbers and a redeem share over 100. */
export class UpdateLoyaltyConfigDto {
  @IsOptional() @Type(() => Number) @IsNumber() points_per_order?: number;
  @IsOptional() @Type(() => Number) @IsNumber() referral_points?: number;
  @IsOptional() @Type(() => Number) @IsNumber() point_value_sar?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) max_redeem_percent?: number;
  @IsOptional() @IsBoolean() redeem_enabled?: boolean;

  // free-form: earning reason -> points (the reasons are the earn rules of the loyalty service, which checks every value is a non-negative number)
  @IsOptional() @IsObject() earn_points?: Record<string, number>;

  // free-form: { daily: {reason: points}, monthly: {reason: points} }, checked bucket by bucket by the loyalty service
  @IsOptional() @IsObject() earn_caps?: Record<string, Record<string, number>>;
}
