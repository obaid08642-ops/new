import { IsArray, IsBoolean, IsDateString, IsDefined, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class ValidateCouponDto {
  @IsOptional()
  @IsNumber()
  order_total?: number;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  provider_id?: string;

  @IsOptional()
  @IsArray()
  categories: any[];

}

export class LoyaltyQuoteDto {
  @IsOptional()
  @IsNumber()
  order_total?: number;

}

export class SetCommissionRuleDto {
  @IsDefined()
  @IsIn(["category", "provider", "service", "campaign"])
  scope: "category" | "provider" | "service" | "campaign";

  @IsDefined()
  @IsNumber()
  percent: number;

  @IsOptional()
  @IsString()
  scope_id?: string;


  @IsOptional()
  @IsString()
  service_type?: string;


  @IsOptional()
  @IsDateString()
  effective_from?: string;


  @IsOptional()
  @IsDateString()
  effective_to?: string;


}

export class ResolveCommissionDto {
  @IsOptional()
  @IsString()
  service_type?: string;

  @IsOptional()
  @IsString()
  provider_id?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  campaign_id?: string;

}

export class RequestApprovalDto {
  @IsOptional()
  @IsIn(['manual_credit', 'manual_debit', 'large_payout', 'large_refund', 'negative_adjustment'])
  type?: 'manual_credit' | 'manual_debit' | 'large_payout' | 'large_refund' | 'negative_adjustment';

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

}

export class DecideApprovalDto {
  @IsOptional()
  @IsBoolean()
  approve?: boolean;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  provider_account_id?: string;


  @IsOptional()
  @IsString()
  state?: string;


  @IsOptional()
  @IsBoolean()
  available_at?: boolean;

  @IsOptional()
  @IsString()
  ref_type?: string;


  @IsOptional()
  @IsString()
  ref_id?: string;


  @IsOptional()
  @IsString()
  order_id?: string;


  @IsOptional()
  @IsNumber()
  gross?: number;


  @IsOptional()
  @IsNumber()
  commission_percent?: number;


  @IsOptional()
  @IsNumber()
  commission?: number;


  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;


  @IsOptional()
  @IsNumber()
  vat?: number;


  @IsOptional()
  @IsString()
  description?: string;


  @IsOptional()
  @IsString()
  actor_id?: string;


  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  refund_id?: string;


  @IsOptional()
  @IsString()
  booking_id: string;

  @IsDefined()
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  patient_id?: string;


  @IsOptional()
  @IsString()
  booking_kind: string;

}
