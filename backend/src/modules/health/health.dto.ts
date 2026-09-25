import { IsBoolean, IsDateString, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class RcDto {
  @IsOptional()
  @IsString()
  dose?: string;

  @IsOptional()
  @IsString()
  dosage?: string;

  @IsOptional()
  @IsString()
  refill_date?: string;

  @IsOptional()
  @IsString()
  medicine_name_en?: string;

  @IsOptional()
  @IsString()
  medicine_name_ar?: string;

  @IsOptional()
  @IsString()
  medication_name?: string;

  @IsOptional()
  @IsString()
  medicine_id?: string;

  @IsOptional()
  @IsString()
  order_id?: string;

  @IsOptional()
  @IsString()
  prescription_id?: string;

  @IsOptional()
  @IsString()
  dosage_form?: string;

  @IsOptional()
  @IsString()
  instructions_ar?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  source?: unknown;

  @IsOptional()
  chronic?: unknown;
}

export class RlgDto {
  @IsOptional()
  status?: any;

  @IsOptional()
  @IsString()
  time_key?: string;


  @IsOptional()
  occurred_at?: any;

}

export class RefillSnoozeDto {
  @IsOptional()
  days?: any;

}

export class AddSleepDto {
  @IsOptional()
  sleep_score?: any;

  @IsOptional()
  duration_hours?: any;

  @IsOptional()
  @IsDateString()
  measured_at?: string;


  @IsOptional()
  @IsString()
  source?: string;


}

export class AddEmergencyContactDto {
  @IsOptional()
  name?: any;

  @IsOptional()
  phone?: any;

  @IsOptional()
  relation?: any;

  @IsOptional()
  isPrimary?: any;

}
