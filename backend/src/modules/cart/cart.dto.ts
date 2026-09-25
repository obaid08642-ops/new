import { IsArray, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class AddContractItemDto {
  @IsOptional()
  @IsString()
  medicine_id?: string;


  @IsOptional()
  @IsString()
  manual_name?: string;


  @IsOptional()
  @IsNumber()
  quantity?: number;


}

export class UpdateContractItemDto {
  @IsOptional()
  quantity?: any;

  @IsOptional()
  @IsNumber()
  qty?: number;


}

export class AddDto {
  @IsOptional()
  service_id?: any;

  @IsOptional()
  name_ar?: any;

  @IsOptional()
  @IsIn(["pharmacy"])
  kind?: string;


  @IsOptional()
  @IsNumber()
  qty?: number;


  @IsOptional()
  name_en?: any;

  @IsOptional()
  @IsNumber()
  price?: number;


  @IsOptional()
  @IsString()
  payment_method?: string;


  @IsOptional()
  insurance_provider?: any;

  @IsOptional()
  home_visit?: any;

  @IsOptional()
  notes?: any;

  @IsOptional()
  meta?: any;

}

export class UpdDto {
  @IsOptional()
  @IsNumber()
  qty?: number;


}

export class ClrDto {
  @IsOptional()
  kind?: any;

}

export class CheckoutDto {
  @IsOptional()
  @IsString()
  address_id?: string;


  @IsOptional()
  @IsString()
  payment_method_id?: string;


  @IsOptional()
  @IsString()
  coupon_code?: string;


  @IsOptional()
  @IsArray()
  prescription_media_ids: any[];

}
