import { IsArray, IsOptional, IsString } from 'class-validator';
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
  patient_id?: any;

  @IsString()
  diagnosis?: any;

  @IsOptional()
  duration_days?: any;

  @IsOptional()
  start_date?: any;

  @IsOptional()
  patient_name?: any;

  @IsOptional()
  recommendations?: any;

  @IsOptional()
  appointment_id?: any;

}

export class IssueMedicalReportDto {
  @IsString()
  findings?: any;

  @IsString()
  summary?: any;

  @IsOptional()
  @IsString()
  patient_id?: any;

  @IsOptional()
  type?: any;

  @IsOptional()
  title_ar?: any;

  @IsOptional()
  title_en?: any;

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
  attachments?: any;

}

export class SetAvailDto {
  status: ProviderAvailabilityStatus;

  @IsOptional()
  note?: any;

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
  duration_minutes?: any;

  @IsOptional()
  max_results?: any;

}

export class DispatchDto {
  @IsOptional()
  timeout_seconds?: any;

}
