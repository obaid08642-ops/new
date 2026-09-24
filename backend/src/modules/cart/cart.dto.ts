import { IsArray, IsOptional } from 'class-validator';

export class AddContractItemDto {
  @IsOptional()
  medicine_id?: any;

  @IsOptional()
  manual_name?: any;

  @IsOptional()
  quantity?: any;

}

export class UpdateContractItemDto {
  @IsOptional()
  quantity?: any;

  @IsOptional()
  qty?: any;

}

export class AddDto {
  @IsOptional()
  service_id?: any;

  @IsOptional()
  name_ar?: any;

  @IsOptional()
  kind?: any;

  @IsOptional()
  qty?: any;

  @IsOptional()
  name_en?: any;

  @IsOptional()
  price?: any;

  @IsOptional()
  payment_method?: any;

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
  qty?: any;

}

export class ClrDto {
  @IsOptional()
  kind?: any;

}

export class CheckoutDto {
  @IsOptional()
  address_id?: any;

  @IsOptional()
  payment_method_id?: any;

  @IsOptional()
  coupon_code?: any;

  @IsOptional()
  @IsArray()
  prescription_media_ids: any[];

}
