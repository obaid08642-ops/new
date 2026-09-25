import { IsArray, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class BookDto {
  @IsDefined()
  @IsArray()
  items: any[];

  @IsOptional()
  scheduled_at?: any;

  @IsOptional()
  payment_method?: any;

  @IsOptional()
  location_type?: any;

  @IsOptional()
  provider_account_id?: any;

  @IsDefined()
  @IsArray()
  documents: any[];

  contact?: any;

  @IsOptional()
  facility_id?: any;

  @IsOptional()
  address?: any;

  @IsOptional()
  notes?: any;

  @IsOptional()
  insurance_provider?: any;

  @IsOptional()
  insurance_member_id?: any;

}

export class TransitionDto {
  @IsOptional()
  state?: any;

  @IsOptional()
  note?: any;

}

export class UploadDocDto {
  @IsDefined()
  @IsString()
  kind: string;

  @IsDefined()
  @IsString()
  url_or_b64: string;

  @IsOptional()
  @IsString()
  filename?: string;
}

export class UpdateInsDto {
  @IsOptional()
  status?: any;

  @IsOptional()
  totalCopay?: any;

  @IsOptional()
  items?: any;

}

export class OptInCashDto {
  @IsOptional()
  optInCash?: any;

}

export class AssignTechDto {
  @IsOptional()
  technician_id?: any;

  @IsOptional()
  technician_name?: any;

  @IsOptional()
  notes?: any;

}

export class UploadReportDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  mime?: any;

  @IsOptional()
  base64?: any;

  @IsOptional()
  url?: any;

  @IsOptional()
  notes?: any;

  @IsOptional()
  @IsArray()
  structuredData: any[];

}

export class RescheduleDto {
  @IsOptional()
  new_date?: any;

  @IsOptional()
  @IsArray()
  reason: any[];

}

export class UpdateGpsDto {
  @IsOptional()
  lat?: any;

  @IsOptional()
  lng?: any;

  @IsOptional()
  eta?: any;

  @IsOptional()
  distance?: any;

}

export class DeclareEmergencyDto {
  @IsOptional()
  @IsArray()
  reason: any[];

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
  @IsOptional()
  state?: any;

  @IsOptional()
  note?: any;

}

export class UpdateStageDto {
  stage: any;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateLabCatalogDto {
  @IsDefined()
  @IsString()
  name_ar: string;

  @IsDefined()
  @IsString()
  name_en: string;

  @IsDefined()
  @IsString()
  category: string;

  @IsDefined()
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
  fasting_required?: boolean;

  @IsOptional()
  @IsNumber()
  turnaround_hours?: number;
}

export class UpdateLabCatalogDto {
  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsOptional()
  @IsString()
  name_en?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  price?: number;

  @IsOptional()
  fasting_required?: boolean;

  @IsOptional()
  @IsNumber()
  turnaround_hours?: number;
}
