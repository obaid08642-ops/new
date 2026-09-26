import { IsArray, IsBoolean, IsDateString, IsDefined, IsEnum, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { LabBookingState } from '../../schemas/lab.schema';

export class BookDto {
  @IsDefined()
  @IsArray()
  items: unknown[];

  @IsDefined()
  @IsString()
  scheduled_at: string;

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
  @IsObject()
  contact?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  facility_id?: string;

  @IsOptional()
  address?: unknown;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  insurance_provider?: string;

  @IsOptional()
  @IsString()
  insurance_member_id?: string;

}

export class TransitionDto {
  @IsDefined()
  @IsEnum(LabBookingState)
  state: LabBookingState;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UploadDocDto {
  @IsOptional()
  @IsString()
  kind?: string;

  @IsOptional()
  @IsString()
  url_or_b64?: string;

  @IsOptional()
  @IsString()
  data_url?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsString()
  uploaded_at?: string;
}

export class UpdateInsDto {
  @IsOptional()
  @IsString()
  status?: string;


  @IsOptional()
  @IsNumber()
  totalCopay?: number;


  @IsOptional()
  @IsArray()
  items?: unknown[];

}

export class OptInCashDto {
  @IsOptional()
  @IsBoolean()
  optInCash?: boolean;


}

export class AssignTechDto {
  @IsOptional()
  @IsString()
  technician_id?: string;


  @IsOptional()
  @IsString()
  technician_name?: string;


  @IsOptional()
  @IsString()
  notes?: string;


}

export class UploadReportDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  mime?: string;

  @IsOptional()
  @IsString()
  base64?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  send_to?: string;

  @IsOptional()
  @IsArray()
  structuredData: unknown[];
}

export class RescheduleDto {
  @IsOptional()
  @IsDateString()
  new_date?: string;


  @IsOptional()
  @IsString()
  reason?: string;

}

export class UpdateGpsDto {
  @IsOptional()
  @IsNumber()
  lat?: number;


  @IsOptional()
  @IsNumber()
  lng?: number;


  @IsOptional()
  @IsNumber()
  eta?: number;


  @IsOptional()
  @IsNumber()
  distance?: number;


}

export class DeclareEmergencyDto {
  @IsOptional()
  @IsString()
  reason?: string;

}

export class RegisterSampleDto {
  @IsDefined()
  @IsString()
  lab_order_id: string;

  @IsDefined()
  @IsString()
  barcode: string;

  @IsDefined()
  @IsArray()
  tests: any[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ForceStateDto {
  @IsDefined()
  @IsEnum(LabBookingState)
  state: LabBookingState;

  @IsOptional()
  @IsString()
  note?: string;

}

export class UpdateStageDto {
  @IsDefined()
  @IsIn(['received', 'analyzing', 'result_ready', 'sent'])
  stage: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateLabCatalogDto {
  @IsDefined()
  @IsString()
  lab_id: string;

  @IsDefined()
  @IsString()
  test_code: string;

  @IsDefined()
  @IsString()
  test_name_ar: string;

  @IsDefined()
  @IsString()
  test_name_en: string;

  @IsOptional()
  in_lab_price?: number;

  @IsOptional()
  home_collection_price?: number;

  @IsOptional()
  accepts_insurance?: boolean;

  @IsOptional()
  @IsArray()
  reference_ranges?: any[];
}

export class UpdateLabCatalogDto {
  @IsOptional()
  @IsString()
  lab_id?: string;

  @IsOptional()
  @IsString()
  test_code?: string;

  @IsOptional()
  @IsString()
  test_name_ar?: string;

  @IsOptional()
  @IsString()
  test_name_en?: string;

  @IsOptional()
  in_lab_price?: number;

  @IsOptional()
  home_collection_price?: number;

  @IsOptional()
  accepts_insurance?: boolean;

  @IsOptional()
  @IsArray()
  reference_ranges?: any[];
}
