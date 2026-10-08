import { IsArray, IsBoolean, IsDefined, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryState, OrderState } from '../../common/enums';

export class ReorderPartialDto {
  @IsOptional()
  @IsString()
  delivery_address?: string;

  @IsOptional()
  @IsString()
  notes?: string;


  @IsOptional()
  @IsString()
  id?: string;

  @IsDefined()
  @IsArray()
  items: any[];

}

export class CancelDto {
  @IsOptional()
  @IsString()
  reason?: string;

}

export class RejectBasketDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  id?: string;

}

export class OptInCashDto {
  @IsOptional()
  @IsBoolean()
  optInCash?: boolean;


}

export class UpdateInsuranceApprovalDto {
  @IsOptional()
  @IsString()
  status?: string;


  @IsOptional()
  @IsNumber()
  totalCopay?: number;


  @IsOptional()
  @IsArray()
  items?: unknown[];

}

export class RejectDto {
  @IsOptional()
  @IsString()
  reason?: string;

}

export class PartialDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  unavailable_medicine_ids?: string[];
}

export class PlaceBidDto {
  @IsOptional()
  @IsNumber()
  expires_in_mins?: number;

  @IsDefined()
  @IsString()
  prescription_request_id: string;

  @IsDefined()
  @IsArray()
  items: any[];

  @IsDefined()
  @IsNumber()
  total_price: number;

}

export class AssignDto {
  @IsDefined()
  @IsString()
  driver_id: string;
}
export class DeliveryUpdateDto {
  @IsDefined()
  @IsEnum(DeliveryState)
  state: DeliveryState;

  @IsOptional()
  location?: unknown;
}
export class AdminTransitionDto {
  @IsDefined()
  @IsEnum(OrderState)
  to: OrderState;

  @IsOptional()
  @IsString()
  reason?: string;
}

/** P22.5 — edit items before the pharmacy accepts. */
export class EditItemDto {
  @IsDefined()
  @IsString()
  medicine_id: string;

  @IsDefined()
  @IsInt()
  @Min(1)
  @Max(99)
  qty: number;
}

export class EditItemsDto {
  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EditItemDto)
  items: EditItemDto[];
}

/** P22.5 — explicit partial refund. */
export class RefundPartialDto {
  @IsDefined()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

/** P22.5 — split shortfall to a second pharmacy (origin defaults to the order address). */
export class SplitOrderDto {
  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}

/** P22.1 — Auto-refill subscription item. */
export class RefillSubscriptionItemDto {
  @IsDefined()
  @IsString()
  medicine_id: string;

  @IsDefined()
  @IsString()
  name: string;

  @IsDefined()
  @IsInt()
  @Min(1)
  qty: number;

  @IsDefined()
  @IsBoolean()
  requires_prescription: boolean;

  @IsOptional()
  @IsString()
  active_ingredient?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  rx_validity_days?: number;
}

/** P22.1 — Create auto-refill subscription. */
export class CreateRefillSubscriptionDto {
  @IsDefined()
  @IsString()
  source_order_id: string;

  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefillSubscriptionItemDto)
  items: RefillSubscriptionItemDto[];

  @IsDefined()
  @IsEnum(['daily', 'weekly', 'monthly', 'custom'])
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';

  @IsDefined()
  @IsInt()
  @Min(1)
  interval_days: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  delivery_address?: Record<string, any>;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  start_after_days?: number;
}

/** P22.2 — Create back-in-stock or price-drop alert. */
export class CreateAlertDto {
  @IsDefined()
  @IsString()
  medicine_id: string;

  @IsDefined()
  @IsString()
  medicine_name: string;

  @IsDefined()
  @IsEnum(['back_in_stock', 'price_drop'])
  type: 'back_in_stock' | 'price_drop';

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  target_price?: number;
}

/** P22.7 — Create review. */
export class CreateReviewDto {
  @IsDefined()
  @IsEnum(['order', 'booking', 'consultation'])
  source_type: 'order' | 'booking' | 'consultation';

  @IsDefined()
  @IsString()
  source_id: string;

  @IsDefined()
  @IsString()
  provider_id: string;

  @IsDefined()
  @IsEnum(['pharmacy', 'doctor', 'lab', 'radiology', 'nurse', 'hospital'])
  provider_type: 'pharmacy' | 'doctor' | 'lab' | 'radiology' | 'nurse' | 'hospital';

  @IsDefined()
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}
