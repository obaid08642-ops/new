import { IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateConfigDto {
  @IsOptional()
  @IsString()
  reason?: string;

  // free-form: { <service type>: percent 0-90 }; keys and ranges are checked in FinanceSuiteService.upsertCommissionConfig
  @IsOptional()
  @IsObject()
  percents?: Record<string, number>;

  @IsOptional()
  @IsNumber()
  vat_percent?: number;

  /** The smallest withdrawal a provider may request (payout_schedule.minimum_payout_sar). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  minimum_payout_sar?: number;

  /** Days a provider earning stays in escrow before it can be withdrawn (settlement.delay_days.default). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  settlement_delay_days?: number;
}

export class ApprovePayoutDto {
  @IsOptional()
  @IsString()
  reason?: string;

}

export class RejectPayoutDto {
  @IsOptional()
  @IsString()
  reason?: string;

}
