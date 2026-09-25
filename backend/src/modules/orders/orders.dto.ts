import { IsArray, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class ReorderPartialDto {
  @IsOptional()
  delivery_address?: any;

  @IsOptional()
  notes?: any;

  @IsOptional()
  id?: any;

  @IsDefined()
  @IsArray()
  items: any[];

}

export class CancelDto {
  @IsOptional()
  reason?: any;

}

export class RejectBasketDto {
  @IsOptional()
  reason?: any;

  @IsOptional()
  id?: any;

}

export class OptInCashDto {
  @IsOptional()
  optInCash?: any;

}

export class UpdateInsuranceApprovalDto {
  @IsOptional()
  status?: any;

  @IsOptional()
  totalCopay?: any;

  @IsOptional()
  items?: any;

}

export class RejectDto {
  @IsOptional()
  reason?: any;

}

export class PartialDto {
  @IsOptional()
  unavailable_medicine_ids?: any;

}

export class PlaceBidDto {
  @IsOptional()
  expires_in_mins?: any;
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
  state: any;

  @IsOptional()
  location?: any;
}
export class AdminTransitionDto {
  to: any;

  @IsOptional()
  @IsString()
  reason?: string;
}
