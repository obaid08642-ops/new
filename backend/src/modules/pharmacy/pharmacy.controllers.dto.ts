import { IsArray, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDto {
  @IsOptional()
  @IsArray()
  items: any[];

  @IsOptional()
  delivery_address?: any;

  @IsOptional()
  patient_notes?: any;

  @IsOptional()
  prescription_attachments?: any;

}

export class UpdateDto {
  @IsDefined()
  @IsArray()
  items: any[];

  @IsOptional()
  delivery_address?: any;

  @IsOptional()
  patient_notes?: any;

}

export class CancelDto {
  @IsOptional()
  reason?: any;

}

export class PaymentIntentDto {
  @IsOptional()
  idempotency_key?: any;

}

export class CancelRejectedInsuranceDto {
  @IsOptional()
  idempotency_key?: any;

  @IsOptional()
  id?: any;

}

export class SelectOfferDto {
  @IsOptional()
  idempotency_key?: any;

  @IsOptional()
  coverage_mode?: any;

}

export class AcceptFinalQuoteDto {
  @IsOptional()
  quote_hash?: any;

  @IsOptional()
  quote_revision?: any;

  @IsOptional()
  idempotency_key?: any;

}

export class RegisterCodDto {
  @IsOptional()
  idempotency_key?: any;

}

export class AcceptInsuranceDto {
  @IsOptional()
  payment_method?: any;

  @IsOptional()
  idempotency_key?: any;

  @IsOptional()
  id?: any;

}

export class ItemActionDto {
  action: any;

  @IsOptional()
  @IsString()
  substitute_sku?: string;

  @IsOptional()
  @IsString()
  substitute_reason?: string;

  @IsOptional()
  @IsNumber()
  qty_offered?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class OutDto {
  @IsOptional()
  courier_name?: any;

  @IsOptional()
  courier_phone?: any;

  @IsOptional()
  eta?: any;

}

export class DeliveredDto {
  @IsOptional()
  collection?: any;

  @IsOptional()
  amount_collected?: any;

  @IsOptional()
  method?: any;

}

export class InsuranceDecisionDto {
  @IsOptional()
  id?: any;

  insurance_decision?: any;

  insurance?: any;

  @IsOptional()
  idempotency_key?: any;

  @IsOptional()
  approval_reference?: any;

  @IsOptional()
  @IsArray()
  items: any[];

}

export class CancelDto3 {
  @IsOptional()
  reason?: any;

}

export class SetTrackingDto {
  @IsOptional()
  inventory_tracking?: any;

}

export class RestockDto {
  @IsOptional()
  qty?: any;

}

export class SampleOrderDto {
  @IsOptional()
  patient_account_id?: any;

}

export class PreviewOfferDto {
  items: any[];

  @IsOptional()
  delivery_option?: any;

  @IsOptional()
  eta_minutes?: any;

  @IsOptional()
  provider_note?: any;

}

export class DraftOfferDto {
  items: any[];

  @IsOptional()
  delivery_option?: any;

  @IsOptional()
  eta_minutes?: any;

  @IsOptional()
  provider_note?: any;

}

export class RejectDto {
  @IsOptional()
  reason?: any;

}

export class PostDto {
  @IsOptional()
  text?: any;

  @IsOptional()
  image_uri?: any;

  @IsOptional()
  substitute_offer?: any;

}

export class ReportDto {
  @IsOptional()
  sku?: any;

  @IsOptional()
  generic_name?: any;

  @IsOptional()
  name_ar?: any;

  @IsOptional()
  dosage?: any;

  @IsOptional()
  form?: any;

  @IsOptional()
  reason?: any;

}

export class CreateDto2 {
  @IsOptional()
  sku?: any;

  @IsOptional()
  generic_name?: any;

  @IsOptional()
  name_ar?: any;

  @IsOptional()
  dosage?: any;

  @IsOptional()
  form?: any;

  @IsOptional()
  reason?: any;

}

export class MarkShortageDto {
  status: any;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectDto5 {
  @IsOptional()
  reason?: any;

}
