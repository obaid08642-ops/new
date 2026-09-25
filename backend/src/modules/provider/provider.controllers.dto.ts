import { IsArray, IsDateString, IsDefined, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { ProviderAvailabilityStatus } from './schemas/requests.schema';

export class DisableDto {
  @IsOptional()
  reason?: any;

}

export class EndConsultationDto {
  @IsOptional()
  soap_subjective?: any;

  @IsOptional()
  soap_objective?: any;

  @IsOptional()
  soap_assessment?: any;

  @IsOptional()
  soap_plan?: any;

  @IsOptional()
  @IsArray()
  prescriptions?: any;

  @IsOptional()
  @IsArray()
  labs?: any;

}

export class IssueSickLeaveDto {
  @IsOptional()
  @IsString()
  patient_id?: string;

  @IsDefined()
  @IsString()
  diagnosis: string;

  @IsOptional()
  @IsNumber()
  duration_days?: number;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsString()
  patient_name?: string;

  @IsOptional()
  @IsString()
  recommendations?: string;

  @IsOptional()
  @IsString()
  appointment_id?: string;
}

export class IssueMedicalReportDto {
  @IsOptional()
  findings?: string;


  @IsOptional()
  summary?: string;


  @IsOptional()
  @IsString()
  patient_id?: string;


  @IsOptional()
  type?: any;

  @IsOptional()
  @IsString()
  title_ar?: string;


  @IsOptional()
  @IsString()
  title_en?: string;


  @IsOptional()
  conclusion?: any;

  @IsOptional()
  diagnosis?: any;

  @IsOptional()
  recommendations?: any;

  @IsOptional()
  critical?: any;

  @IsOptional()
  @IsArray()
  attachments?: unknown[];


}

export class SetAvailDto {
  status: ProviderAvailabilityStatus;

  @IsOptional()
  @IsString()
  note?: string;


}

export class PreviewAdHocDto {
  type: string;

  required_provider_type?: any;

  @IsArray()
  exclude_provider_ids?: any;

  @IsOptional()
  @IsString()
  payload?: any;

  patient_location?: any;

  @IsOptional()
  priority?: any;

  @IsOptional()
  scheduled_at?: any;

  @IsOptional()
  @IsNumber()
  duration_minutes?: number;


  @IsOptional()
  @IsNumber()
  max_results?: number;


}

export class DispatchDto {
  @IsOptional()
  timeout_seconds?: any;

}
