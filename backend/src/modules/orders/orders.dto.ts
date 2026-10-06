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
