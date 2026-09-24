import { IsArray, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class SavePolicyDto {
  @IsOptional()
  company_id?: any;

  @IsOptional()
  plan_class?: any;

  @IsOptional()
  member_id?: any;

  @IsOptional()
  policy_number?: any;

  @IsOptional()
  card_image_url?: any;

}

export class CreateRequestDto {
  @IsOptional()
  booking_id?: any;

  @IsOptional()
  booking_kind?: any;

}

export class PayCopayDto {
  @IsOptional()
  payment_id?: any;

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
  documents?: any;

  @IsDefined()
  @IsString()
  reason: string;

}

export class DecideDto {
  @IsOptional()
  decision?: any;

  @IsOptional()
  copay_percent?: any;

  @IsDefined()
  @IsString()
  reason: string;

  requests?: any;

  findOne?: any;

}

export class GatekeeperDto {
  @IsOptional()
  status?: any;

  @IsOptional()
  copay?: any;

  @IsOptional()
  approval_code?: any;

}

export class PaymentConfirmDto {
  @IsOptional()
  request_id?: any;

  @IsOptional()
  id?: any;

  @IsOptional()
  payment_id?: any;

}

export class PayCopayDto2 {
  @IsOptional()
  request_id?: any;

  @IsOptional()
  id?: any;

  @IsOptional()
  payment_id?: any;

}

export class RequestDto {
  @IsOptional()
  booking_id?: any;

  @IsOptional()
  amount_paid?: any;

  @IsDefined()
  @IsString()
  reason: string;

  @IsOptional()
  scheduled_at?: any;

  @IsOptional()
  booking_kind?: any;

  @IsOptional()
  payment_id?: any;

}

export class DecideRefundDto {
  @IsOptional()
  approve?: any;

  @IsOptional()
  note?: any;

  @IsOptional()
  decision?: any;

  @IsOptional()
  copay_percent?: any;

  @IsDefined()
  @IsString()
  reason: string;

  requests?: any;

  findOne?: any;

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
