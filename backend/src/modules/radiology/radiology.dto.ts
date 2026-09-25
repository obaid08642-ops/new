import { IsArray, IsBoolean, IsDefined, IsEnum, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { RadiologyBookingState } from '../../schemas/radiology.schema';

export class BookDto {
  @IsOptional()
  @IsString()
  service_id?: string;

  @IsOptional()
  @IsString()
  scheduled_at?: string;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  location_type?: string;

  @IsOptional()
  @IsString()
  provider_account_id?: string;

  @IsOptional()
  @IsArray()
  documents?: unknown[];

  @IsOptional()
  @IsNumber()
  total_price?: number;
}

export class TransitionDto {
  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateInsDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AssignTechDto {
  @IsOptional()
  @IsString()
  technician_id?: string;
}

export class UploadReportDto {
  @IsOptional()
  @IsString()
  pdf_url?: string;

  @IsOptional()
  @IsString()
  dicom_url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image_urls?: string[];

  @IsDefined()
  @IsString()
  report_storage_object_id: string;

  @IsOptional()
  @IsString()
  dicom_storage_object_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scan_storage_object_ids?: string[];

  @IsOptional()
  @IsString()
  findings?: string;
}

export class RadiologyDocumentDto {
  @IsDefined() @IsIn(['doctor_request', 'preauth', 'report', 'scan', 'other']) kind: string;
  @IsDefined() @IsString() url_or_b64: string;
  @IsOptional() @IsString() filename?: string;
}

export class ShiftWindowDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}

// Catalog delta proposals go to the admin approval workflow (Module 15) —
// they describe a *proposed* catalog entry or schedule change, not an
// existing catalog row, so every proposal field is accepted here and
// validated again at approval time.
export class CatalogDeltaRequestDto {
  @IsOptional() @IsString() name_ar?: string;
  @IsOptional() @IsString() name_en?: string;
  @IsOptional() @IsString() modality_category?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsNumber() estimated_duration_minutes?: number;
  @IsOptional() @IsBoolean() insurance_availability?: boolean;
  @IsOptional() @IsBoolean() portable_ultrasound?: boolean;
  @IsOptional() @IsBoolean() requires_pregnancy_check?: boolean;
  @IsOptional() @IsBoolean() requires_metal_implant_check?: boolean;
  @IsOptional() @IsBoolean() requires_contrast_allergy_check?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) preparation_keys?: string[];
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsArray() @IsBoolean({ each: true }) working_days?: boolean[];
  @IsOptional() @IsObject() morning_shift?: Record<string, unknown>;
  @IsOptional() @IsObject() evening_shift?: Record<string, unknown>;
  @IsOptional() @IsBoolean() emergency_available?: boolean;
}

export class ForceStateDto {
  @IsDefined()
  @IsEnum(RadiologyBookingState)
  state: RadiologyBookingState;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AbortScanDto {
  @IsDefined()
  @IsString()
  reason: string;
}
export class InsuranceApprovalDto {
  @IsDefined()
  @IsString()
  approval_code: string;

  @IsDefined()
  @IsNumber()
  copay: number;
}
export class RescheduleDto {
  @IsDefined()
  @IsString()
  new_date: string;

  @IsDefined()
  @IsString()
  reason: string;
}

export class CreateRadiologyCatalogDto {
  @IsDefined()
  @IsString()
  name_ar: string;

  @IsDefined()
  @IsString()
  name_en: string;

  @IsDefined()
  @IsString()
  modality: string;

  @IsDefined()
  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  short_code?: string;

  @IsOptional()
  @IsString()
  description_ar?: string;

  @IsOptional()
  @IsString()
  description_en?: string;

  @IsOptional()
  @IsString()
  body_part?: string;

  @IsOptional()
  @IsNumber()
  old_price?: number;

  @IsOptional()
  contrast_required?: boolean;

  @IsOptional()
  fasting_required?: boolean;

  @IsOptional()
  @IsNumber()
  fasting_hours?: number;

  @IsOptional()
  home_visit_supported?: boolean;

  @IsOptional()
  facility_visit_supported?: boolean;

  @IsOptional()
  @IsNumber()
  turnaround_hours?: number;

  @IsOptional()
  @IsArray()
  preparation_ar?: string[];

  @IsOptional()
  @IsArray()
  preparation_en?: string[];
}

export class UpdateRadiologyCatalogDto {
  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsOptional()
  @IsString()
  name_en?: string;

  @IsOptional()
  @IsString()
  modality?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  short_code?: string;

  @IsOptional()
  @IsString()
  body_part?: string;

  @IsOptional()
  @IsNumber()
  old_price?: number;

  @IsOptional()
  @IsArray()
  preparation_ar?: string[];

  @IsOptional()
  @IsArray()
  preparation_en?: string[];
}

export class SubmitReportForReviewDto {
}
