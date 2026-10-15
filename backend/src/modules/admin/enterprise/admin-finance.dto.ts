import { IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

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
