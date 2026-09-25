import { IsArray, IsBoolean, IsDateString, IsDefined, IsIn, IsNumber, IsObject, IsOptional, IsString, ValidateIf } from 'class-validator';

export class AddVitalDto {
  @IsDefined() @IsString() type: string;
  @ValidateIf((_object, value) => typeof value === 'string') @IsString()
  @ValidateIf((_object, value) => typeof value === 'number') @IsNumber()
  value: string | number;
  @IsOptional() @IsNumber() value_secondary?: number;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsDateString() measured_at?: string;
  @IsOptional() @IsDateString() recorded_at?: string;
  @IsOptional() @IsString() context?: string;
  @IsOptional() @IsString() time_of_day?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsNumber() systolic?: number;
  @IsOptional() @IsNumber() diastolic?: number;
}

export class UpdateVitalDto extends AddVitalDto {}

export class UpdateReminderDto {
  @IsOptional() @IsString() dose?: string;
  @IsOptional() @IsString() medicine_name_ar?: string;
  @IsOptional() @IsString() medicine_name_en?: string;
  @IsOptional() @IsNumber() dosage_count?: number;
  @IsOptional() @IsIn(['tablet', 'capsule', 'ml', 'drop', 'spray']) dosage_form?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) times?: string[];
  @IsOptional() @IsString() time_zone?: string;
  @IsOptional() @IsString() frequency?: string;
  @IsOptional() @IsDateString() start_date?: string;
  @IsOptional() @IsDateString() end_date?: string;
  @IsOptional() @IsNumber() duration_days?: number;
  @IsOptional() @IsString() instructions_ar?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsBoolean() chronic?: boolean;
  @IsOptional() @IsNumber() pills_remaining?: number;
  @IsOptional() @IsDateString() refill_date?: string;
}

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
  @IsIn(['taken', 'skipped', 'missed'])
  status?: 'taken' | 'skipped' | 'missed';

  @IsOptional()
  @IsString()
  time_key?: string;


  @IsOptional()
  @IsDateString()
  occurred_at?: string;

}

export class RefillSnoozeDto {
  @IsOptional()
  @IsNumber()
  days?: number;

}

export class AddSleepDto {
  @IsOptional()
  @IsNumber()
  sleep_score?: number;

  @IsOptional()
  @IsNumber()
  duration_hours?: number;

  @IsOptional()
  @IsDateString()
  measured_at?: string;


  @IsOptional()
  @IsString()
  source?: string;


}

export class AddEmergencyContactDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsOptional()
  @IsString()
  relation?: string;

  @IsOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

}
