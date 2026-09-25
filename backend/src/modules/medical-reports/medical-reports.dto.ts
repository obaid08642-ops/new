import { IsArray, IsBoolean, IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

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
  @IsString()
  patient_id?: string;

  @IsOptional()
  @IsString()
  title_ar?: string;

  @IsOptional()
  @IsString()
  patient_name?: string;

  @IsOptional()
  @IsString()
  title_en?: string;

  @IsOptional()
  @IsString()
  report_type?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  recommendations?: string;

  @IsOptional()
  @IsBoolean()
  critical?: boolean;

  @IsOptional()
  @IsString()
  appointment_id?: string;

  @IsOptional()
  @IsString()
  prescription_id?: string;

  @IsOptional()
  @IsString()
  lab_booking_id?: string;

  @IsOptional()
  @IsString()
  radiology_booking_id?: string;

  @IsOptional()
  @IsString()
  doctor_id?: string;

  @IsOptional()
  @IsString()
  doctor_name?: string;

  @IsOptional()
  @IsString()
  facility_id?: string;

  @IsOptional()
  @IsString()
  facility_name?: string;

  @IsOptional()
  @IsArray()
  attachments?: unknown[];


  @IsOptional()
  @IsDateString()
  issued_at?: string;


}
