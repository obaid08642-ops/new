import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, Min, Max } from 'class-validator';

export class RewardDto {
  // The admin form (loyalty-config.tsx) sends title_ar/title_en/points_required/
  // reward_type/stock; the old DTO demanded name/points_cost, so every save
  // and toggle was rejected. Both shapes are accepted and normalized.
  @IsOptional() @IsObject() name?: Record<string, string>;
  @IsOptional() @IsString() title_ar?: string;
  @IsOptional() @IsString() title_en?: string;

  @IsOptional() @IsObject() description?: Record<string, string>;

  @IsOptional() @IsNumber() @Min(0) points_cost?: number;
  @IsOptional() @IsNumber() @Min(0) points_required?: number;

  @IsOptional() @IsString() reward_type?: string;
  @IsOptional() @IsNumber() @Min(0) stock?: number;

  @IsOptional() @IsString() image?: string;

  @IsOptional() @IsBoolean() active?: boolean;
}

export class ChallengeDto {
  @IsOptional() @IsObject() name?: Record<string, string>;
  @IsOptional() @IsString() title_ar?: string;
  @IsOptional() @IsString() title_en?: string;

  @IsOptional() @IsObject() description?: Record<string, string>;

  @IsOptional() @IsNumber() @Min(0) points_reward?: number;
  @IsOptional() @IsNumber() @Min(0) reward_points?: number;

  @IsOptional() @IsString() target_action?: string;
  @IsOptional() @IsNumber() @Min(0) target_count?: number;
  @IsOptional() @IsString() start_date?: string;
  @IsOptional() @IsString() end_date?: string;

  @IsOptional() @IsNumber() duration_days?: number;

  @IsOptional() @IsBoolean() active?: boolean;
}

export class LoyaltyConfigDto {
  // The admin config form also sends these two; the old DTO rejected the
  // whole save because of them.
  @IsOptional() @IsNumber() @Min(0) points_per_order?: number;
  @IsOptional() @IsNumber() @Min(0) referral_points?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10) // PRODUCT.md: loyalty points are capped at 10% of the order.
  max_redeem_percent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  point_value_sar?: number;

  @IsOptional()
  @IsBoolean()
  redeem_enabled?: boolean;

  @IsOptional()
  @IsObject()
  earn_points?: Record<string, number>;

  @IsOptional()
  @IsObject()
  earn_caps?: { daily?: Record<string, number>; monthly?: Record<string, number> };
}
