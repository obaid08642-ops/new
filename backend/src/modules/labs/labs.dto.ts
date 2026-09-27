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

// Admin catalog editor (admin/src/pages/admin/catalog-manager.tsx). medical_review_status publishes/unpublishes.
export class CreateLabCatalogDto {
  @IsDefined() @IsString() name_ar: string;
  @IsDefined() @IsString() name_en: string;
  @IsOptional() @IsString() short_code?: string;
  @IsOptional() @IsString() description_ar?: string;
  @IsOptional() @IsString() description_en?: string;
  @IsDefined() @IsString() category: string;
  @IsOptional() @IsString() sample_type?: string;
  @IsDefined() @IsNumber() price: number;
  @IsOptional() @IsNumber() old_price?: number;
  @IsOptional() @IsBoolean() fasting_required?: boolean;
  @IsOptional() @IsNumber() fasting_hours?: number;
  @IsOptional() @IsBoolean() home_visit_supported?: boolean;
  @IsOptional() @IsBoolean() facility_visit_supported?: boolean;
  @IsOptional() @IsNumber() turnaround_hours?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) preparation_ar?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) preparation_en?: string[];
  @IsOptional() @IsBoolean() is_package?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) included_services?: string[];
  @IsOptional() @IsNumber() popularity?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsBoolean() unavailable?: boolean;
  @IsOptional() @IsBoolean() medical_referral_required?: boolean;
  @IsOptional() @IsIn(['pending', 'approved', 'rejected', 'suspended']) medical_review_status?: string;
}

export class UpdateLabCatalogDto {
  @IsOptional() @IsString() name_ar?: string;
  @IsOptional() @IsString() name_en?: string;
  @IsOptional() @IsString() short_code?: string;
  @IsOptional() @IsString() description_ar?: string;
  @IsOptional() @IsString() description_en?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() sample_type?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsNumber() old_price?: number;
  @IsOptional() @IsBoolean() fasting_required?: boolean;
  @IsOptional() @IsNumber() fasting_hours?: number;
  @IsOptional() @IsBoolean() home_visit_supported?: boolean;
  @IsOptional() @IsBoolean() facility_visit_supported?: boolean;
  @IsOptional() @IsNumber() turnaround_hours?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) preparation_ar?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) preparation_en?: string[];
  @IsOptional() @IsBoolean() is_package?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) included_services?: string[];
  @IsOptional() @IsNumber() popularity?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsBoolean() unavailable?: boolean;
  @IsOptional() @IsBoolean() medical_referral_required?: boolean;
  @IsOptional() @IsIn(['pending', 'approved', 'rejected', 'suspended']) medical_review_status?: string;
}

