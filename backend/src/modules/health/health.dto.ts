import { IsOptional } from 'class-validator';

export class RcDto {
  @IsOptional()
  dose?: any;

  @IsOptional()
  refill_date?: any;

  @IsOptional()
  medicine_name_en?: any;

  @IsOptional()
  medicine_id?: any;

  @IsOptional()
  order_id?: any;

  @IsOptional()
  prescription_id?: any;

  @IsOptional()
  dosage_form?: any;

  @IsOptional()
  instructions_ar?: any;

  @IsOptional()
  source?: any;

  @IsOptional()
  chronic?: any;

}

export class RlgDto {
  @IsOptional()
  status?: any;

  @IsOptional()
  time_key?: any;

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

  measured_at?: any;

  @IsOptional()
  source?: any;

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
