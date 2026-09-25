import { IsArray, IsBoolean, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDto {
  @IsOptional()
  doctor_id?: any;

  @IsOptional()
  slot_id?: any;

  @IsOptional()
  type?: any;

  @IsOptional()
  notes?: any;

  @IsOptional()
  symptoms?: any;

  @IsOptional()
  visit_location?: any;

  @IsOptional()
  payment_method_id?: any;

  @IsOptional()
  insurance_provider?: any;

  @IsOptional()
  insurance_member_id?: any;

  @IsOptional()
  for_member_id?: any;

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
  reason?: any;

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
  provider_account_id?: any;

  @IsOptional()
  address?: any;

  @IsOptional()
  scheduled_at?: any;

  @IsOptional()
  insurance?: any;

  @IsOptional()
  location_type?: any;

  @IsOptional()
  delivery_address?: any;

}
