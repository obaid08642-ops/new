import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

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
  @IsString() image: string;
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
  @IsOptional() @IsString() expiry?: string;
  @IsOptional() @IsString() national_id?: string;
}

export class SubmitClaimDto {
  @IsString() booking_id: string;
  @IsString() service_type: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsArray() documents?: string[];
}

export class CreateInsuranceNetworkDto {
  @IsString() company_id: string;
  @IsString() provider_id: string;
  @IsOptional() @IsString() network_type?: string;
}

export class CreateCoverageRuleDto {
  @IsString() company_id: string;
  @IsString() service_type: string;
  @IsOptional() @IsNumber() copay_percent?: number;
  @IsOptional() @IsBoolean() covered?: boolean;
}
