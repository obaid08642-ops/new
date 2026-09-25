import { IsDefined, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateCompanyDto {
  @IsDefined()
  @IsString()
  code: string;

}

export class UpdateCompanyDto {
  @IsOptional()
  @IsIn(["number"])
  catalog_version: string;

  @IsOptional()
  logo_verified_at?: any;

  @IsOptional()
  retired_at?: any;

  @IsOptional()
  @IsIn(["boolean"])
  is_active: string;

}

export class OcrExtractDto {
  @IsOptional()
  image_base64?: any;

  @IsOptional()
  file?: any;

  @IsOptional()
  mime_type?: any;

}

export class UploadPolicyDto {
  @IsOptional()
  policy_number?: any;

  @IsOptional()
  provider?: any;

  @IsOptional()
  company_id?: any;

  @IsOptional()
  network?: any;

  @IsOptional()
  class?: any;

  @IsOptional()
  expiry_date?: any;

  @IsOptional()
  member_name?: any;

  @IsOptional()
  national_id?: any;

  @IsOptional()
  pdf_url?: any;

  @IsOptional()
  ocr_extracted?: any;

}

export class NphiesEligibilityDto {
  @IsOptional()
  national_id?: any;

  @IsOptional()
  insurance_company_code?: any;

  @IsOptional()
  member_id?: any;

}

export class SavePolicyDto {
  @IsOptional()
  company_id?: any;

  @IsOptional()
  provider?: any;

  @IsOptional()
  policy_number?: any;

  @IsOptional()
  network?: any;

  @IsOptional()
  class?: any;

  @IsOptional()
  expiry_date?: any;

  @IsOptional()
  member_name?: any;

  @IsOptional()
  national_id?: any;

  verified?: any;

  @IsOptional()
  pdf_url?: any;

  ocr_extracted?: any;

  nphies_eligible?: any;

}

export class SubmitClaimDto {
  @IsOptional()
  amount?: any;

  @IsOptional()
  @IsString()
  service: string;

  @IsOptional()
  covered?: any;

}
