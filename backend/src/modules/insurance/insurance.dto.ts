import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class InsuranceDecideDto {
  @IsBoolean()
  approve: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateCompanyDto {
  @IsString() name_ar: string;
  @IsString() name_en: string;
  @IsOptional() @IsString() code?: string;
}

export class UpdateCompanyDto {
  @IsOptional() @IsString() name_ar?: string;
  @IsOptional() @IsString() name_en?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsString() catalog_version?: string;
  @IsOptional() @IsString() logo_verified_at?: string;
  @IsOptional() @IsString() retired_at?: string;
}

export class OcrExtractDto {
  // add-policy.tsx uploads the camera shot as image_base64 + mime_type; the
  // old DTO demanded a field no client ever sends.
  @IsOptional() @IsString() image?: string;
  @IsOptional() @IsString() image_base64?: string;
  @IsOptional() @IsString() mime_type?: string;
}

export class UploadPolicyDto {
  @IsString() company_id: string;
  @IsString() member_id: string;
  @IsOptional() @IsString() policy_number?: string;
  @IsOptional() @IsString() card_image_url?: string;
}

export class NphiesEligibilityDto {
  @IsString() provider_id: string;
  @IsString() patient_id: string;
  @IsString() service_type: string;
  @IsOptional() @IsString() national_id?: string;
  @IsOptional() @IsString() insurance_company_code?: string;
  @IsOptional() @IsString() member_id?: string;
}

export class SavePolicyDto {
  @IsString() company_id: string;
  @IsString() member_id: string;
  @IsOptional() @IsString() policy_number?: string;
  // R24: screen sends member_name + expiry_date (not provider/expiry/verified/ocr_extracted)
  @IsOptional() @IsString() member_name?: string;
  @IsOptional() @IsString() expiry_date?: string;
  @IsOptional() @IsString() national_id?: string;
  @IsOptional() @IsString() expiry?: string; // legacy alias
}

export class SubmitClaimDto {
  @IsString() booking_id: string;
  // The claim form (patient-web) sends booking_kind; service_type is the older
  // name for the same thing. One of the two is required.
  @IsOptional() @IsString() service_type?: string;
  @IsOptional() @IsIn(['consultation', 'pharmacy', 'lab', 'radiology', 'nursing', 'home_care', 'physiotherapy'])
  booking_kind?: string;
  @IsOptional() @IsString() claim_type?: string;
  @IsOptional() @IsNumber() amount?: number;
  @IsOptional() @IsString() service_date?: string;
  @IsOptional() @IsString() attachment_url?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsArray() documents?: string[];
}

export class CreateInsuranceNetworkDto {
  // company_id comes from the path (companies/:companyId/networks); the admin
  // form sends the network's own fields, which the old DTO rejected outright.
  @IsString() code: string;
  @IsString() name_ar: string;
  @IsString() name_en: string;
  @IsOptional() @IsString() network_type?: string;
  @IsOptional() @IsNumber() tier_level?: number;
  @IsOptional() @IsString() provider_id?: string;
}

export class CreateCoverageRuleDto {
  // company_id also comes from the path (networks/:networkId/rules). The admin
  // form labels the field service_type; coverage lookup accepts either name.
  @IsOptional() @IsString() service_key?: string;
  @IsOptional() @IsString() service_type?: string;
  @IsOptional() @IsNumber() copay_percent?: number;
  @IsOptional() @IsNumber() copay_flat_limit?: number;
  @IsOptional() @IsBoolean() requires_preauth?: boolean;
  @IsOptional() @IsNumber() max_annual_limit?: number;
}

/** Attach/refresh one insurance network contract on a provider or facility. */
export class AttachInsuranceContractDto {
  @IsString() company_id: string;
  @IsString() network_id: string;
  @IsOptional() @IsArray() @IsString({ each: true }) covered_classes?: string[];
  @IsOptional() @IsNumber() copay_percent?: number;
  @IsOptional() @IsNumber() copay_flat?: number;
}
