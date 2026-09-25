import { IsArray, IsBoolean, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class ReorderPartialDto {
  @IsOptional()
  delivery_address?: any;

  @IsOptional()
  @IsString()
  notes?: string;


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
  items?: any;

}

export class RejectDto {
  @IsOptional()
  reason?: any;

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
