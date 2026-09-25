import { IsArray, IsBoolean, IsDateString, IsDefined, IsEnum, IsIn, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { AllocationItemAction } from './schemas/pharmacy.schema';
import { Type } from 'class-transformer';

export class CreateDto {
  @IsOptional()
  @IsArray()
  items: any[];

  @IsOptional()
  @IsString()
  delivery_address?: string;

  @IsOptional()
  @IsString()
  patient_notes?: string;

  @IsOptional()
  @IsArray()
  prescription_attachments?: unknown[];


}

export class UpdateDto {
  @IsDefined()
  @IsArray()
  items: any[];

  @IsOptional()
  @IsString()
  delivery_address?: string;

  @IsOptional()
  @IsString()
  patient_notes?: string;

}

export class CancelDto {
  @IsOptional()
  @IsString()
  reason?: string;

}

export class PaymentIntentDto {
  @IsOptional()
  @IsString()
  idempotency_key?: string;

}

export class CancelRejectedInsuranceDto {
  @IsOptional()
  @IsString()
  idempotency_key?: string;

  @IsOptional()
  @IsString()
  id?: string;

}

export class SelectOfferDto {
  @IsOptional()
  @IsString()
  idempotency_key?: string;

  @IsOptional()
  @IsIn(['cash', 'cod', 'card', 'insurance'])
  coverage_mode?: string;

}

export class AcceptFinalQuoteDto {
  @IsOptional()
  @IsString()
  quote_hash?: string;

  @IsOptional()
  @IsNumber()
  quote_revision?: number;

  @IsOptional()
  @IsString()
  idempotency_key?: string;

}

export class RegisterCodDto {
  @IsOptional()
  @IsString()
  idempotency_key?: string;

}

export class AcceptInsuranceDto {
  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  idempotency_key?: string;

  @IsOptional()
  @IsString()
  id?: string;

}

export class ItemActionDto {
  @IsDefined()
  @IsEnum(AllocationItemAction)
  action: AllocationItemAction;

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

export class CodCollectionDto {
  @IsDefined()
  @IsIn(['cash', 'card_terminal'])
  method: 'cash' | 'card_terminal';

  @IsDefined()
  @IsNumber()
  amount_collected: number;
}

export class DeliveredDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CodCollectionDto)
  collection?: CodCollectionDto;

  @IsOptional()
  @IsNumber()
  amount_collected?: number;

  @IsOptional()
  @IsString()
  method?: string;

}

export class InsuranceDecisionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsObject()
  insurance_decision?: Record<string, unknown>;


  @IsOptional()
  @IsObject()
  insurance?: Record<string, unknown>;


  @IsOptional()
  @IsString()
  idempotency_key?: string;

  @IsOptional()
  @IsString()
  approval_reference?: string;

  @IsOptional()
  @IsArray()
  items: any[];

}

export class CancelDto3 {
  @IsOptional()
  @IsString()
  reason?: string;

}

export class SetTrackingDto {
  @IsOptional()
  @IsBoolean()
  inventory_tracking?: boolean;

}

export class RestockDto {
  @IsOptional()
  @IsNumber()
  qty?: number;

}

export class SampleOrderDto {
  @IsOptional()
  @IsString()
  patient_account_id?: string;

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
  @IsString()
  reason?: string;

}

export class SubstituteOfferDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  price?: number;
}

export class PostDto {
  @IsOptional()
  @IsString()
  text?: string;


  @IsOptional()
  @IsString()
  image_uri?: string;


  @IsOptional()
  @ValidateNested()
  @Type(() => SubstituteOfferDto)
  substitute_offer?: SubstituteOfferDto;

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
  @IsDefined()
  @IsIn(['none', 'availability_may_be_limited', 'admin_flagged_shortage'])
  status: 'none' | 'availability_may_be_limited' | 'admin_flagged_shortage';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectDto5 {
  @IsOptional()
  @IsString()
  reason?: string;

}
