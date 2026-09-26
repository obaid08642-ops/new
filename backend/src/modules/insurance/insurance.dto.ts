import { IsBoolean, IsDateString, IsDefined, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateInsuranceNetworkDto {
  @IsDefined() @IsString() code: string;
  @IsDefined() @IsString() name_ar: string;
  @IsDefined() @IsString() name_en: string;
  @IsOptional() @IsNumber() tier_level?: number;
  @IsOptional() @IsString() source_url?: string;
  @IsOptional() @IsString() source_label?: string;
  @IsOptional() @IsIn(['pending_review', 'verified', 'retired']) catalog_status?: string;
  @IsOptional() @IsString() provenance?: string;
  @IsOptional() @IsDateString() retired_at?: string;
}

export class CreateCoverageRuleDto {
  @IsDefined() @IsString() service_type: string;
  @IsOptional() @IsString() service_key?: string;
  @IsOptional() @IsNumber() copay_percent?: number;
  @IsOptional() @IsNumber() copay_flat_limit?: number;
  @IsOptional() @IsBoolean() requires_preauth?: boolean;
  @IsOptional() @IsNumber() max_annual_limit?: number;
}

export class CreateCompanyDto {
  @IsDefined()
  @IsString()
  code: string;

  @IsDefined()
  @IsString()
  name_ar: string;

  @IsDefined()
  @IsString()
  name_en: string;
}

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsOptional()
  @IsString()
  name_en?: string;

  @IsOptional()
  @IsString()
  logo_url?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsNumber()
  catalog_version?: number;

  @IsOptional()
  @IsDateString()
  logo_verified_at?: string;

  @IsOptional()
  @IsDateString()
  retired_at?: string;
}

export class OcrExtractDto {
  @IsOptional()
  @IsString()
  image_base64?: string;

  @IsOptional()
  file?: unknown;

  @IsOptional()
  @IsString()
  mime_type?: string;
}

export class UploadPolicyDto {
  @IsOptional()
  @IsString()
  policy_number?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  company_id?: string;

  @IsOptional()
  @IsString()
  network?: string;

  @IsOptional()
  @IsString()
  class?: string;

  @IsOptional()
  @IsDateString()
  expiry_date?: string;

  @IsOptional()
  @IsString()
  member_name?: string;

  @IsOptional()
  @IsString()
  national_id?: string;

  @IsOptional()
  @IsString()
  pdf_url?: string;

  @IsOptional()
  @IsBoolean()
  ocr_extracted?: boolean;
}

export class NphiesEligibilityDto {
  @IsOptional()
  @IsString()
  national_id?: string;

  @IsOptional()
  @IsString()
  insurance_company_code?: string;

  @IsOptional()
  @IsString()
  member_id?: string;
}

export class SavePolicyDto {
  @IsOptional()
  @IsString()
  company_id?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  policy_number?: string;

  @IsOptional()
  @IsString()
  network?: string;

  @IsOptional()
  @IsString()
  class?: string;

  @IsOptional()
  @IsDateString()
  expiry_date?: string;

  @IsOptional()
  @IsString()
  member_name?: string;

  @IsOptional()
  @IsString()
  national_id?: string;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @IsOptional()
  @IsString()
  pdf_url?: string;

  @IsOptional()
  @IsBoolean()
  ocr_extracted?: boolean;

  @IsOptional()
  @IsBoolean()
  nphies_eligible?: boolean;
}

export class SubmitClaimDto {
  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  service?: string;

  @IsOptional()
  @IsNumber()
  covered?: number;

  @IsOptional()
  @IsString()
  claim_type?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  submitted_at?: string;
}
