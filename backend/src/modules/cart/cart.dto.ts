import { IsArray, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

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
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  qty?: number;


}

export class AddDto {
  @IsOptional()
  @IsString()
  service_id?: string;

  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsOptional()
  @IsIn(['lab', 'radiology', 'pharmacy', 'doctor', 'home_care'])
  kind?: string;


  @IsOptional()
  @IsNumber()
  qty?: number;


  @IsOptional()
  @IsString()
  name_en?: string;

  @IsOptional()
  @IsNumber()
  price?: number;


  @IsOptional()
  @IsString()
  payment_method?: string;


  @IsOptional()
  @IsString()
  insurance_provider?: string;

  @IsOptional()
  @IsBoolean()
  home_visit?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;

}

export class UpdDto {
  @IsOptional()
  @IsNumber()
  qty?: number;


}

export class ClrDto {
  @IsOptional()
  @IsString()
  kind?: string;

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
