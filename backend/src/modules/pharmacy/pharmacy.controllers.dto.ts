import { IsArray, IsDateString, IsDefined, IsIn, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDto {
  @IsOptional()
  @IsArray()
  items: any[];

  @IsOptional()
  delivery_address?: any;

  @IsOptional()
  patient_notes?: any;

  @IsOptional()
  @IsArray()
  prescription_attachments?: unknown[];


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
  @IsString()
  courier_name?: string;

  @IsOptional()
  @IsString()
  courier_phone?: string;

  @IsOptional()
  @IsDateString()
  eta?: string;


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

  @IsOptional()
  @IsObject()
  insurance_decision?: Record<string, unknown>;


  @IsOptional()
  @IsObject()
  insurance?: Record<string, unknown>;


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

export class OfferItemDto {
  @IsDefined()
  @IsString()
  order_item_id: string;

  @IsDefined()
  @IsIn(['available', 'unavailable', 'substitute'])
  availability: 'available' | 'unavailable' | 'substitute';

  @IsOptional()
  @IsNumber()
  qty_offered?: number;

  @IsOptional()
  @IsString()
  inventory_item_id?: string;

  @IsOptional()
  @IsString()
  substitute_inventory_item_id?: string;

  @IsOptional()
  @IsNumber()
  unit_price_override?: number;

  @IsOptional()
  @IsString()
  price_override_reason?: string;
}

export class PreviewOfferDto {
  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferItemDto)
  items: OfferItemDto[];

  @IsOptional()
  @IsIn(['delivery', 'pickup'])
  delivery_option?: 'delivery' | 'pickup';

  @IsOptional()
  @IsNumber()
  eta_minutes?: number;

  @IsOptional()
  @IsString()
  provider_note?: string;
}

export class DraftOfferDto {
  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferItemDto)
  items: OfferItemDto[];

  @IsOptional()
  @IsIn(['delivery', 'pickup'])
  delivery_option?: 'delivery' | 'pickup';

  @IsOptional()
  @IsNumber()
  eta_minutes?: number;

  @IsOptional()
  @IsString()
  provider_note?: string;
}

export class RejectDto {
  @IsOptional()
  reason?: any;

}

export class PostDto {
  @IsOptional()
  @IsString()
  text?: string;


  @IsOptional()
  @IsString()
  image_uri?: string;


  @IsOptional()
  substitute_offer?: any;

}

export class ReportDto {
  @IsOptional()
  @IsString()
  sku?: string;


  @IsOptional()
  @IsString()
  generic_name?: string;


  @IsOptional()
  @IsString()
  name_ar?: string;


  @IsOptional()
  @IsString()
  dosage?: string;


  @IsOptional()
  @IsString()
  form?: string;


  @IsOptional()
  @IsString()
  reason?: string;


}

export class CreateDto2 {
  @IsOptional()
  @IsString()
  sku?: string;


  @IsOptional()
  @IsString()
  generic_name?: string;


  @IsOptional()
  @IsString()
  name_ar?: string;


  @IsOptional()
  @IsString()
  dosage?: string;


  @IsOptional()
  @IsString()
  form?: string;


  @IsOptional()
  @IsString()
  reason?: string;


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
