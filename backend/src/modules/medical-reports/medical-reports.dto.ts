import { IsArray, IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class ShareDto {
  @IsOptional()
  @IsString()
  doctor_profile_id?: string;


  @IsOptional()
  @IsString()
  doctor_name?: string;


}

export class CreateDto {
  @IsOptional()
  patient_id?: any;

  @IsOptional()
  title_ar?: any;

  @IsOptional()
  patient_name?: any;

  @IsOptional()
  title_en?: any;

  @IsOptional()
  report_type?: any;

  @IsOptional()
  summary?: any;

  @IsOptional()
  body?: any;

  @IsOptional()
  diagnosis?: any;

  @IsOptional()
  recommendations?: any;

  @IsOptional()
  critical?: any;

  @IsOptional()
  appointment_id?: any;

  @IsOptional()
  prescription_id?: any;

  @IsOptional()
  lab_booking_id?: any;

  @IsOptional()
  radiology_booking_id?: any;

  @IsOptional()
  @IsIn(["doctor"])
  doctor_id: string;

  @IsOptional()
  @IsIn(["doctor"])
  doctor_name: string;

  @IsOptional()
  facility_id?: any;

  @IsOptional()
  facility_name?: any;

  @IsOptional()
  @IsArray()
  attachments?: unknown[];


  @IsOptional()
  @IsDateString()
  issued_at?: string;


}
