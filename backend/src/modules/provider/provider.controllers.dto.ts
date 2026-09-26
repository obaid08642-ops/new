import { IsArray, IsBoolean, IsDateString, IsDefined, IsEnum, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { ProviderAvailabilityStatus, ProviderRequestPriority } from './schemas/requests.schema';

export class DisableDto {
  @IsOptional()
  @IsString()
  reason?: string;

}

export class WithdrawAliasDto {
  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  iban?: string;

}

export class UploadProfileImageDto {
  @IsDefined()
  @IsString()
  data_base64: string;

  @IsDefined()
  @IsIn(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
  mime: string;

  @IsDefined()
  @IsString()
  original_name: string;
}

export class ReplaceImageDto {
  @IsDefined()
  @IsString()
  data_base64: string;

  @IsDefined()
  @IsIn(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
  mime: string;
}

export class AssignStaffDto {
  @IsDefined()
  @IsString()
  staff_id: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class EndConsultationDto {
  @IsOptional()
  @IsString()
  soap_subjective?: string;

  @IsOptional()
  @IsString()
  soap_objective?: string;

  @IsOptional()
  @IsString()
  soap_assessment?: string;

  @IsOptional()
  @IsString()
  soap_plan?: string;

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
  @IsString()
  findings?: string;


  @IsOptional()
  @IsString()
  summary?: string;


  @IsOptional()
  @IsString()
  patient_id?: string;


  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  title_ar?: string;


  @IsOptional()
  @IsString()
  title_en?: string;


  @IsOptional()
  @IsString()
  conclusion?: string;

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
  @IsArray()
  attachments?: unknown[];


}

export class SetAvailDto {
  @IsDefined()
  @IsEnum(ProviderAvailabilityStatus)
  status: ProviderAvailabilityStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

export class PreviewAdHocDto {
  @IsDefined()
  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  required_provider_type?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exclude_provider_ids?: string[];

  @IsOptional()
  @IsString()
  payload?: string;

  @IsOptional()
  @IsObject()
  patient_location?: { lat: number; lng: number };

  @IsOptional()
  @IsEnum(ProviderRequestPriority)
  priority?: ProviderRequestPriority;

  @IsOptional()
  @IsDateString()
  scheduled_at?: string;

  @IsOptional()
  @IsNumber()
  duration_minutes?: number;


  @IsOptional()
  @IsNumber()
  max_results?: number;


}

export class DispatchDto {
  @IsOptional()
  @IsNumber()
  timeout_seconds?: number;

}
