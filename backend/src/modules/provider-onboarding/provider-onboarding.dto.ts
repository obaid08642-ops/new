import { IsArray, IsBoolean, IsDefined, IsEnum, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { ProviderType } from '../../common/enums';

export class Step2Dto {
  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsOptional()
  @IsString()
  name_en?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  location?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  license_number?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  license_documents?: string[];

  @IsOptional()
  @IsNumber()
  coverage_radius_km?: number;

  @IsOptional()
  @IsBoolean()
  accepts_insurance?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accepted_insurance?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  insurance_plans?: string[];

  @IsOptional()
  @IsBoolean()
  accepts_cash?: boolean;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsString()
  bank_account_name?: string;

  @IsOptional()
  @IsString()
  pharmacy_type?: string;

  @IsOptional()
  @IsString()
  cr_number?: string;

  @IsOptional()
  @IsString()
  moh_license_number?: string;

  @IsOptional()
  @IsString()
  sfda_license_number?: string;

  @IsOptional()
  @IsString()
  tax_number?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clinic_images?: string[];

  @IsOptional()
  @IsString()
  scfhs_license_number?: string;

  @IsOptional()
  @IsString()
  national_id?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  clinic_name?: string;

  @IsOptional()
  @IsString()
  display_name_ar?: string;

  @IsOptional()
  @IsString()
  display_name_en?: string;

  @IsOptional()
  @IsString()
  profile_photo?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  legal_name?: string;

  @IsOptional()
  @IsString()
  pharmacist_name?: string;

  @IsOptional()
  @IsString()
  tech_officer_name?: string;

  @IsOptional()
  @IsString()
  tech_officer_scfhs?: string;

  @IsOptional()
  @IsString()
  lab_category?: string;

  @IsOptional()
  @IsString()
  lab_accreditation?: string;

  @IsOptional()
  @IsString()
  scfhs_expiry?: string;

}

export class Step3Dto {
  @IsOptional()
  @IsString()
  academic_degree?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accepted_insurance?: string[];

  @IsOptional()
  @IsBoolean()
  accepts_cash?: boolean;

  @IsOptional()
  @IsBoolean()
  accepts_insurance?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ambulance_roster?: string[];

  @IsOptional()
  @IsString()
  available_equipment_text?: string;

  @IsOptional()
  @IsObject()
  base_location?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  clinic_duration?: number;

  @IsOptional()
  @IsString()
  clinic_name?: string;

  @IsOptional()
  @IsNumber()
  consultation_fee?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  consultation_modes?: string[];

  @IsOptional()
  @IsNumber()
  coverage_radius_km?: number;

  @IsOptional()
  @IsNumber()
  delivery_fee?: number;

  @IsOptional()
  @IsNumber()
  delivery_radius_km?: number;

  @IsOptional()
  @IsString()
  display_name_ar?: string;

  @IsOptional()
  @IsString()
  display_name_en?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  doctors_roster?: string[];

  @IsOptional()
  @IsString()
  emergency_level?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabled_categories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipment_list?: string[];

  @IsOptional()
  @IsBoolean()
  express_delivery?: boolean;

  @IsOptional()
  @IsNumber()
  express_fee?: number;

  @IsOptional()
  @IsNumber()
  express_minutes?: number;

  @IsOptional()
  @IsNumber()
  free_delivery_above?: number;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  gender_pref?: string;

  @IsOptional()
  @IsBoolean()
  has_icu_units?: boolean;

  @IsOptional()
  @IsBoolean()
  has_insurance_coordinator?: boolean;

  @IsOptional()
  @IsBoolean()
  has_own_delivery?: boolean;

  @IsOptional()
  @IsBoolean()
  has_own_drivers?: boolean;

  @IsOptional()
  @IsNumber()
  home_collector_count?: number;

  @IsOptional()
  @IsString()
  home_collector_gender?: string;

  @IsOptional()
  @IsNumber()
  home_duration?: number;

  @IsOptional()
  @IsNumber()
  home_transport_fee?: number;

  @IsOptional()
  @IsNumber()
  home_transport_price?: number;

  @IsOptional()
  @IsNumber()
  home_visit_fee?: number;

  @IsOptional()
  @IsNumber()
  home_visit_radius_km?: number;

  @IsOptional()
  @IsBoolean()
  home_visit_supported?: boolean;

  @IsOptional()
  @IsString()
  hospital?: string;

  @IsOptional()
  @IsString()
  insurance_clinic?: string;

  @IsOptional()
  @IsString()
  insurance_home?: string;

  @IsOptional()
  @IsString()
  insurance_online?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  insurance_plans?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lab_roster?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsNumber()
  min_order_sar?: number;

  @IsOptional()
  @IsString()
  national_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nursing_roster?: string[];

  @IsOptional()
  @IsString()
  nursing_services?: string;

  @IsOptional()
  @IsNumber()
  online_consultation_fee?: number;

  @IsOptional()
  @IsBoolean()
  otc_selling?: boolean;

  @IsOptional()
  @IsNumber()
  paramedic_count?: number;

  @IsOptional()
  @IsString()
  pharmacy_chain?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pharmacy_roster?: string[];

  @IsOptional()
  @IsNumber()
  price_clinic?: number;

  @IsOptional()
  @IsNumber()
  price_home?: number;

  @IsOptional()
  @IsNumber()
  price_online?: number;

  @IsOptional()
  @IsString()
  radiation_safety_license?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  radiology_roster?: string[];

  @IsOptional()
  @IsBoolean()
  rx_dispensing?: boolean;

  @IsOptional()
  @IsObject()
  scan_insurance_map?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  schedule_clinic?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  schedule_home?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  schedule_video?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  service_area_cities?: string[];

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sub_specialties?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  test_categories?: string[];

  @IsOptional()
  @IsObject()
  test_home_map?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  test_insurance_map?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  test_turnaround_map?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  vacation_date?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vehicle_plates?: string[];

  @IsOptional()
  @IsNumber()
  vehicles_count?: number;

  @IsOptional()
  @IsNumber()
  video_duration?: number;

  @IsOptional()
  @IsObject()
  working_hours?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  years_experience?: number;

}

export class StartDto {
  @IsDefined()
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsDefined()
  @IsEnum(ProviderType)
  type: ProviderType;
}

export class SubmitDto {
  @IsOptional()
  @IsString()
  signer_name?: string;

  @IsOptional()
  @IsString()
  signer_role?: string;

  @IsOptional()
  @IsString()
  signature_url?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsObject()
  full_data?: Record<string, unknown>;
}

export class AdminContractVisibilityDto {
  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}
