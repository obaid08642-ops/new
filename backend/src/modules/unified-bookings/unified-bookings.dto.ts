import { IsArray, IsBoolean, IsDefined, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateDto {
  @IsOptional()
  @IsString()
  doctor_id?: string;


  @IsOptional()
  @IsString()
  slot_id?: string;


  @IsOptional()
  @IsIn(['video', 'clinic', 'home'])
  type?: 'video' | 'clinic' | 'home';

  @IsOptional()
  @IsString()
  notes?: string;


  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  symptoms?: string[];


  @IsOptional()
  @IsObject()
  visit_location?: { lat: number; lng: number; address: string };

  @IsOptional()
  @IsString()
  payment_method_id?: string;


  @IsOptional()
  @IsString()
  insurance_provider?: string;


  @IsOptional()
  @IsString()
  insurance_member_id?: string;


  @IsOptional()
  @IsString()
  for_member_id?: string;


}

export class CancelRootDto {
  @IsOptional()
  reason?: any;

}

export class RescheduleRootDto {
  @IsOptional()
  new_slot_id?: any;

}

export class CancelDto {
  @IsOptional()
  @IsString()
  reason?: string;


}

export class ReschedDto {
  @IsOptional()
  scheduled_at?: any;

  @IsOptional()
  reason?: any;

}

export class MatchDto {
  kind: any;

  @IsOptional()
  @IsArray()
  service_ids?: any[];

  @IsOptional()
  @IsArray()
  service_keys?: any[];

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  insurance?: string;

  @IsOptional()
  @IsBoolean()
  home_visit?: boolean;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  location?: any;

  @IsOptional()
  @IsNumber()
  max_results?: number;
}

export class NursingDto {
  @IsDefined()
  @IsArray()
  service_keys: any[];

  @IsOptional()
  @IsString()
  service_id?: string;

  @IsOptional()
  @IsString()
  scheduled_at?: string;

  @IsOptional()
  address?: any;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  insurance?: string;

  @IsOptional()
  location?: any;

  @IsOptional()
  @IsBoolean()
  auto_book?: boolean;
}

export class CheckoutDto {
  @IsOptional()
  @IsString()
  provider_account_id?: string;


  @IsOptional()
  address?: any;

  @IsOptional()
  @IsString()
  scheduled_at?: string;


  @IsOptional()
  insurance?: unknown;

  @IsOptional()
  @IsIn(['home', 'facility'])
  location_type?: 'home' | 'facility';


  @IsOptional()
  delivery_address?: unknown;

}
