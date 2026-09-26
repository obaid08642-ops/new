import { IsArray, IsBoolean, IsDefined, IsEnum, IsNumber, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ProviderType } from '../../common/enums';

/** One working-hours row as the wizards send it (pharmacy may send day 'All' for 24/7). */
export class WorkingHoursEntryDto {
  @IsString() @MaxLength(20) day: string;
  @IsOptional() @IsString() open?: string | null;
  @IsOptional() @IsString() close?: string | null;
  @IsOptional() @IsString() open_evening?: string | null;
  @IsOptional() @IsString() close_evening?: string | null;
  @IsOptional() @IsBoolean() closed?: boolean;
}

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

  // All registration screens send the typed street address as text (schema: string).
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

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

  // free-form: {companyId: [planIds]} map from the wizard's insurance picker
  @IsOptional()
  @IsObject()
  insurance_plans?: Record<string, string[]>;

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


  @IsOptional()
  @IsString()
  @MaxLength(80)
  region?: string;
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

  // free-form: facility wizard roster entries (one object per sub-unit: specialty, hours, images)
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  doctors_roster?: Record<string, unknown>[];

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

  // doctor wizard: whether a transport surcharge applies (the amount is home_transport_price)
  @IsOptional()
  @IsBoolean()
  home_transport_fee?: boolean;

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

  // free-form: {companyId: [planIds]} map from the wizard's insurance picker
  @IsOptional()
  @IsObject()
  insurance_plans?: Record<string, string[]>;

  // free-form: facility wizard roster entries (one object per sub-unit: specialty, hours, images)
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  lab_roster?: Record<string, unknown>[];

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

  // free-form: facility wizard roster entries (one object per sub-unit: specialty, hours, images)
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  nursing_roster?: Record<string, unknown>[];

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

  // Chain name. Older wizard builds send `false` ("not a chain"): treated as absent.
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'boolean' ? undefined : value))
  @IsString()
  pharmacy_chain?: string;

  // free-form: facility wizard roster entries (one object per sub-unit: specialty, hours, images)
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  pharmacy_roster?: Record<string, unknown>[];

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

  // free-form: facility wizard roster entries (one object per sub-unit: specialty, hours, images)
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  radiology_roster?: Record<string, unknown>[];

  @IsOptional()
  @IsBoolean()
  rx_dispensing?: boolean;

  @IsOptional()
  @IsObject()
  scan_insurance_map?: Record<string, unknown>;

  // free-form: per-day slots from the wizard's schedule builder (schema: array of objects)
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  schedule_clinic?: Record<string, unknown>[];

  // free-form: per-day slots from the wizard's schedule builder (schema: array of objects)
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  schedule_home?: Record<string, unknown>[];

  // free-form: per-day slots from the wizard's schedule builder (schema: array of objects)
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  schedule_video?: Record<string, unknown>[];

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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursEntryDto)
  working_hours?: WorkingHoursEntryDto[];

  @IsOptional()
  @IsNumber()
  years_experience?: number;


  // Lab / radiology wizard: price lists and home-collection settings
  // free-form: {testOrScanId: price} maps
  @IsOptional()
  @IsObject()
  test_prices?: Record<string, number>;

  // free-form: {scanId: price}
  @IsOptional()
  @IsObject()
  scan_prices?: Record<string, number>;

  @IsOptional()
  @IsNumber()
  home_collection_fee?: number;

  @IsOptional()
  @IsString()
  target_genders?: string;

  // Nursing / home-care wizard pricing (schema: pricingModel string[], price* numbers)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pricingModel?: string[];

  @IsOptional() @IsNumber() priceVisit?: number;
  @IsOptional() @IsNumber() priceHour?: number;
  @IsOptional() @IsNumber() priceDay?: number;
  @IsOptional() @IsNumber() priceMonth?: number;
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
