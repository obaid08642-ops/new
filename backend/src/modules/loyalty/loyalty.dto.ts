import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class RewardDto {
  @IsObject()
  name: Record<string, string>;

  @IsOptional()
  @IsObject()
  description?: Record<string, string>;

  @IsNumber()
  @Min(0)
  points_cost: number;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ChallengeDto {
  @IsObject()
  name: Record<string, string>;

  @IsOptional()
  @IsObject()
  description?: Record<string, string>;

  @IsNumber()
  @Min(0)
  points_reward: number;

  @IsOptional()
  @IsNumber()
  duration_days?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class LoyaltyConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
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
