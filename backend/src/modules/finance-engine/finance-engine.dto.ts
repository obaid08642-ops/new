import { IsArray, IsDateString, IsDefined, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

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
  @IsString()
  provider_account_id?: string;


  @IsOptional()
  @IsString()
  state?: string;


  @IsOptional()
  available_at?: any;

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
  type?: any;

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
  meta?: any;

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
