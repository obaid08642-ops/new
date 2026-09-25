import { IsArray, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

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

export class ForceStateDto {
  @IsOptional()
  state?: any;

  @IsOptional()
  note?: any;

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
