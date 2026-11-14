import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateDisplayDto {
  @IsOptional()
  @IsString()
  display_name: string;

  @IsOptional()
  @IsString()
  locale: string;

  @IsOptional()
  @IsString()
  avatar_media_id: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsDateString()
  birth_date?: string;

  @IsOptional()
  @IsNumber()
  height_cm?: number;

  @IsOptional()
  @IsNumber()
  weight_kg?: number;

  @IsOptional()
  @IsString()
  blood_type?: string;

}

export class UpdatePatientInsuranceDto {
  @IsOptional() @IsString() provider?: string;
  @IsOptional() @IsString() provider_name?: string;
  @IsOptional() @IsString() policy_number?: string;
  @IsOptional() @IsString() member_id?: string;
  @IsOptional() @IsString() network?: string;
  @IsOptional() @IsString() class?: string;
  @IsOptional() @IsDateString() expiry_date?: string;
  @IsOptional() @IsString() member_name?: string;
  @IsOptional() @IsString() national_id?: string;
  @IsOptional() @IsBoolean() verified?: boolean;
  @IsOptional() @IsString() pdf_url?: string;
  @IsOptional() @IsBoolean() ocr_extracted?: boolean;
  /** As printed on the card (optional): the copay share in percent and the cap per item in SAR; the pre-booking estimate uses them. */
  @IsOptional() @IsNumber() @Min(0) @Max(100) copay_percent?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1000000) copay_cap_sar?: number;
}

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  current_password?: string;

  @IsOptional()
  @IsString()
  new_password?: string;

}
