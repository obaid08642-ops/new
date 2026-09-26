import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

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
  @IsOptional() @IsBoolean() nphies_eligible?: boolean;
}

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  current_password?: string;

  @IsOptional()
  @IsString()
  new_password?: string;

}
