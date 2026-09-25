import { IsArray, IsBoolean, IsDefined, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class SavePolicyDto {
  @IsOptional()
  @IsString()
  company_id?: string;

  @IsOptional()
  @IsString()
  plan_class?: string;

  @IsOptional()
  @IsString()
  member_id?: string;

  @IsOptional()
  @IsString()
  policy_number?: string;

  @IsOptional()
  @IsString()
  card_image_url?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  network?: string;

  @IsOptional()
  @IsString()
  class?: string;

  @IsOptional()
  @IsString()
  expiry_date?: string;

  @IsOptional()
  @IsString()
  member_name?: string;

  @IsOptional()
  @IsString()
  national_id?: string;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @IsOptional()
  @IsBoolean()
  ocr_extracted?: boolean;
}

export class CreateRequestDto {
  @IsOptional()
  @IsString()
  booking_id?: string;

  @IsOptional()
  @IsString()
  booking_kind?: string;
}

export class PayCopayDto {
  @IsOptional()
  @IsString()
  payment_id?: string;
}

export class ResubmitDto {
  @IsOptional()
  @IsArray()
  documents?: any[];

  @IsOptional()
  @IsString()
  note?: string;
}

export class AppealDto {
  @IsOptional()
  @IsArray()
  documents?: unknown[];

  @IsDefined()
  @IsString()
  reason: string;

}

export class DecideDto {
  @IsDefined()
  @IsIn(['approve_full', 'approve_partial', 'reject'])
  decision: string;

  @IsOptional()
  @IsNumber()
  copay_percent?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class GatekeeperDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  copay?: number;

  @IsOptional()
  @IsString()
  approval_code?: string;
}

export class PaymentConfirmDto {
  @IsOptional()
  @IsString()
  request_id?: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  payment_id?: string;
}

export class PayCopayDto2 {
  @IsOptional()
  @IsString()
  request_id?: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  payment_id?: string;
}

export class RequestDto {
  @IsOptional()
  @IsString()
  booking_id?: string;

  @IsOptional()
  @IsNumber()
  amount_paid?: number;

  @IsDefined()
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  scheduled_at?: string;

  @IsOptional()
  @IsString()
  booking_kind?: string;

  @IsOptional()
  @IsString()
  payment_id?: string;
}

export class DecideRefundDto {
  @IsOptional()
  @IsBoolean()
  approve?: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AccrueDto {
  @IsOptional()
  @IsString()
  order_id?: string;

  @IsOptional()
  @IsString()
  booking_id?: string;

  @IsDefined()
  @IsString()
  provider_id: string;

  @IsDefined()
  @IsString()
  service_type: string;

  @IsDefined()
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  payment_method?: string;
}
