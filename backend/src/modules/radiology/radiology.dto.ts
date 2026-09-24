import { IsArray, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class BookDto {
  @IsOptional()
  @IsString()
  service_id: string;

  @IsOptional()
  payment_method?: any;

  @IsOptional()
  location_type?: any;

  @IsOptional()
  @IsArray()
  documents: any[];

  @IsOptional()
  total_price?: any;

}

export class TransitionDto {
  @IsOptional()
  state?: any;

  @IsOptional()
  note?: any;

}

export class UpdateInsDto {
  @IsOptional()
  status?: any;

  @IsOptional()
  reason?: any;

}

export class AssignTechDto {
  @IsOptional()
  technician_id?: any;

}

export class UploadReportDto {
  @IsOptional()
  pdf_url?: any;

  @IsOptional()
  dicom_url?: any;

  @IsOptional()
  image_urls?: any;

  @IsOptional()
  @IsString()
  report_storage_object_id: string;

  @IsDefined()
  @IsString()
  dicom_storage_object_id: string;

  @IsDefined()
  @IsArray()
  scan_storage_object_ids: any[];

  @IsOptional()
  findings?: any;

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
