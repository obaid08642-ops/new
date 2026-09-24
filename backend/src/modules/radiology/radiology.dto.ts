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
