import { IsArray, IsBoolean, IsDefined, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
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
