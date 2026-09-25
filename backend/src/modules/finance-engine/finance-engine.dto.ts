import { IsArray, IsDefined, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class ValidateCouponDto {
  @IsOptional()
  order_total?: any;

  @IsOptional()
  code?: any;

  @IsOptional()
  provider_id?: any;

  @IsOptional()
  @IsArray()
  categories: any[];

}

export class LoyaltyQuoteDto {
  @IsOptional()
  order_total?: any;

}

export class SetCommissionRuleDto {
  @IsDefined()
  @IsIn(["category", "provider", "service", "campaign"])
  scope: "category" | "provider" | "service" | "campaign";

  @IsDefined()
  @IsNumber()
  percent: number;

  @IsOptional()
  scope_id?: any;

  @IsOptional()
  service_type?: any;

  @IsOptional()
  effective_from?: any;

  @IsOptional()
  effective_to?: any;

}

export class ResolveCommissionDto {
  @IsOptional()
  service_type?: any;

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
  type?: any;

  @IsOptional()
  payload?: any;

  @IsOptional()
  reason?: any;

  @IsOptional()
  amount?: any;

}

export class DecideApprovalDto {
  @IsOptional()
  approve?: any;

  @IsOptional()
  note?: any;

  @IsOptional()
  provider_account_id?: any;

  @IsOptional()
  state?: any;

  @IsOptional()
  available_at?: any;

  @IsOptional()
  ref_type?: any;

  @IsOptional()
  ref_id?: any;

  @IsOptional()
  order_id?: any;

  @IsOptional()
  gross?: any;

  @IsOptional()
  commission_percent?: any;

  @IsOptional()
  commission?: any;

  @IsOptional()
  type?: any;

  @IsOptional()
  amount?: any;

  @IsOptional()
  vat?: any;

  @IsOptional()
  description?: any;

  @IsOptional()
  actor_id?: any;

  @IsOptional()
  meta?: any;

  @IsOptional()
  refund_id?: any;

  @IsOptional()
  @IsString()
  booking_id: string;

  @IsDefined()
  @IsString()
  reason: string;

  @IsOptional()
  patient_id?: any;

  @IsOptional()
  @IsString()
  booking_kind: string;

}
