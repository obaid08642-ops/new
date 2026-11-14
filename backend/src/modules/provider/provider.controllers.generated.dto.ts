import { IsArray, IsBoolean, IsDateString, IsDefined, IsEnum, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, MaxLength, Min, Max, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OtpPurpose } from './schemas';

export class RegisterDto {
  @IsDefined()
  @IsString()
  email: string;

  @IsDefined()
  @IsString()
  password: string;


  @IsDefined()
  @IsString()
  confirm_password: string;


  @IsDefined()
  provider_type: any;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;

}

export class LoginDto {
  @IsDefined()
  @IsString()
  email: string;

  @IsDefined()
  @IsString()
  password: string;


  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;

}

export class RefreshDto {
  @IsDefined()
  @IsString()
  refresh_token: string;


  @IsDefined()
  @IsString()
  device_identifier: string;


  @IsDefined()
  @IsString()
  session_id: string;


  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;

}

export class LogoutDto {
  @IsDefined()
  @IsString()
  session_id: string;


  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;

}

export class SendOtpDto {
  @IsOptional()
  @IsEnum(OtpPurpose)
  purpose?: OtpPurpose;

  @IsDefined()
  @IsString()
  email: string;

  @IsOptional()
  meta?: unknown;
}

export class VerifyEmailDto {
  @IsDefined()
  @IsString()
  email: string;

  @IsDefined()
  @IsString()
  code: string;


  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;

}

export class ForgotDto {
  @IsDefined()
  @IsString()
  email: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;

}

export class VerifyResetCodeDto {
  @IsDefined()
  @IsString()
  email: string;

  @IsDefined()
  @IsString()
  code: string;


  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;

}

export class ResetDto {
  @IsDefined()
  @IsString()
  email: string;

  @IsDefined()
  @IsString()
  code: string;


  @IsDefined()
  @IsString()
  new_password: string;


  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;

}

export class AddPhoneDto {
  @IsOptional()
  @IsArray()
  number?: any[];

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsArray()
  is_primary?: any[];

  @IsOptional()
  @IsArray()
  country_code?: any[];

}

export class UploadDocDto {
  @IsDefined()
  @IsString()
  doc_type: string;

  @IsDefined()
  @IsObject()
  file: Record<string, unknown>;

  @IsOptional()
  @IsString()
  doc_number?: string;

  @IsOptional()
  @IsString()
  issuer?: string;

  @IsOptional()
  @IsString()
  issued_date?: string;

  @IsOptional()
  @IsString()
  expiry_date?: string;
}

export class UploadDocDto2 {
  @IsOptional()
  @IsString()
  doc_type?: string;

  @IsDefined()
  file: any;

  @IsOptional()
  @IsNumber()
  doc_number?: number;

  @IsOptional()
  @IsString()
  issuer?: string;

  @IsDefined()
  issued_date: any;

  @IsDefined()
  expiry_date: any;

}

export class UpsertBankDto {
  @IsOptional()
  @IsString()
  bank_code?: string;

  @IsOptional()
  @IsString()
  holder_name?: string;

  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsNumber()
  vat_number?: number;

}

export class SubmitDeltaDto {
  @IsOptional()
  @IsObject()
  changes?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  newData?: Record<string, unknown>;

}

export class SubmitDeltaDto2 {
  @IsOptional()
  @IsObject()
  changes?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  newData?: Record<string, unknown>;

}

export class InviteDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsDefined()
  @IsArray()
  permissions: any[];

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

}

export class AcceptDto {
  @IsDefined()
  @IsString()
  token: string;

  @IsDefined()
  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  full_name?: string;


  @IsOptional()
  @IsString()
  phone?: string;


  @IsDefined()
  @IsString()
  password: string;

}

export class UpdateDto2 {
  @IsOptional()
  @IsString()
  role?: string;

  @IsDefined()
  @IsArray()
  permissions: any[];

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

}

export class RejectDeltaDto {
  @IsOptional()
  @IsString()
  reason?: string;

}

export class RejectBankDto {
  /** Why the payout account was refused: the provider reads it and sends a corrected one. */
  @IsString()
  @MaxLength(500)
  reason: string;

}

export class LicenseExpiryQueryDto {
  /** Providers whose licence expires within this many days (already expired ones are always included). Default 60. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(730)
  within_days?: number;

  @IsOptional()
  @IsString()
  type?: string;

}

export class RejectDeltaDto2 {
  @IsOptional()
  @IsString()
  reason?: string;

}

/** 19.3: the admin's own check of the SCFHS licence, accepted only when the SCFHS service cannot answer. */
export class ManualLicenseCheckDto {
  @IsDefined()
  @IsString()
  @MaxLength(200)
  reference: string;

  @IsDefined()
  @IsDateString()
  expiry_date: string;
}

export class ApproveDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ManualLicenseCheckDto)
  manual_license_check?: ManualLicenseCheckDto;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  commission_cash?: number;

  @IsOptional()
  @IsNumber()
  commission?: number;

  @IsOptional()
  @IsNumber()
  commission_insurance?: number;
}

export class RejectDto {
  @IsOptional()
  @IsString()
  reason?: string;

}

export class NeedsChangesDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  docs_needing_replacement?: string[];

}

export class SuspendDto {
  @IsOptional()
  @IsString()
  reason?: string;

}

export class ReviewDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

}

export class ReactivateDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ManualLicenseCheckDto)
  manual_license_check?: ManualLicenseCheckDto;

  /** The renewed licence expiry (ISO date): required to bring back a provider whose licence expired. */
  @IsOptional()
  @IsDateString()
  license_expiry_date?: string;

}

export class AcceptDto2 {
  @IsOptional()
  @IsString()
  note?: string;


  @IsOptional()
  @IsString()
  scheduled_at?: string;


}

export class RejectDto2 {
  @IsOptional()
  @IsString()
  reason?: string;


  @IsOptional()
  @IsString()
  note?: string;


}

export class StartDto {
  @IsOptional()
  @IsString()
  note?: string;


}

export class CompleteDto {
  @IsOptional()
  @IsString()
  note?: string;


}

export class CancelDto {
  @IsOptional()
  @IsString()
  reason?: string;


  @IsOptional()
  @IsString()
  note?: string;


}

export class UpsertPharmaDto {
  // provider-app ActiveInventoryScreen: add-from-catalog (sku = catalog medicine id) and item edits.
  @IsOptional() @IsString() @MaxLength(120) sku?: string;
  @IsOptional() @IsString() @MaxLength(300) name_ar?: string;
  @IsOptional() @IsString() @MaxLength(300) name_en?: string;
  @IsOptional() @IsString() @MaxLength(64) barcode?: string;
  @IsOptional() @IsString() @MaxLength(120) category?: string;
  @IsOptional() @IsString() @MaxLength(200) generic_name?: string;
  @IsOptional() @IsString() @MaxLength(60) form?: string;
  @IsOptional() @IsString() @MaxLength(60) dosage?: string;
  @IsOptional() @IsString() @MaxLength(60) pack_size?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) substitute_skus?: string[];
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsNumber() @Min(0) stock?: number;
  @IsOptional() @IsNumber() @Min(0) min_stock_alert?: number;
  @IsOptional() @IsDateString() last_restocked_at?: string;
  @IsOptional() @IsBoolean() available?: boolean;
  @IsOptional() @IsBoolean() insurance_covered?: boolean;
  @IsOptional() @IsString() @MaxLength(500) coverage_notes?: string;
  @IsOptional() @IsDateString() expiry_date?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class UpsertLabDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() name_ar?: string;
  @IsOptional() @IsString() name_en?: string;
  @IsOptional() @IsString() sample_type?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(720) turnaround_hours?: number;
  @IsOptional() @IsBoolean() home_collection_supported?: boolean;
  @IsOptional() @IsBoolean() premises_supported?: boolean;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000) price?: number;
  @IsOptional() @IsString() @MaxLength(8) currency?: string;
  @IsOptional() @IsBoolean() available?: boolean;
  @IsOptional() @IsBoolean() insurance_covered?: boolean;
  @IsOptional() @IsString() @MaxLength(500) coverage_notes?: string;
}

export class UpsertLabDto2 {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() name_ar?: string;
  @IsOptional() @IsString() name_en?: string;
  @IsOptional() @IsString() sample_type?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(720) turnaround_hours?: number;
  @IsOptional() @IsBoolean() home_collection_supported?: boolean;
  @IsOptional() @IsBoolean() premises_supported?: boolean;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000) price?: number;
  @IsOptional() @IsString() @MaxLength(8) currency?: string;
  @IsOptional() @IsBoolean() available?: boolean;
  @IsOptional() @IsBoolean() insurance_covered?: boolean;
  @IsOptional() @IsString() @MaxLength(500) coverage_notes?: string;
}

export class UpsertRadDto {
  @IsOptional() @IsString() scan_type?: string;
  @IsOptional() @IsString() body_part?: string;
  @IsOptional() @IsString() service_id?: string;
  @IsOptional() @IsString() name_ar?: string;
  @IsOptional() @IsString() name_en?: string;
  @IsOptional() @IsBoolean() contrast_supported?: boolean;
  @IsOptional() @IsBoolean() home_supported?: boolean;
  @IsOptional() @IsBoolean() premises_supported?: boolean;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000) price?: number;
  @IsOptional() @IsString() @MaxLength(8) currency?: string;
  @IsOptional() @IsBoolean() available?: boolean;
  @IsOptional() @IsBoolean() insurance_covered?: boolean;
  @IsOptional() @IsString() @MaxLength(500) coverage_notes?: string;
}

export class UpsertRadDto2 {
  @IsOptional() @IsString() scan_type?: string;
  @IsOptional() @IsString() body_part?: string;
  @IsOptional() @IsString() service_id?: string;
  @IsOptional() @IsString() name_ar?: string;
  @IsOptional() @IsString() name_en?: string;
  @IsOptional() @IsBoolean() contrast_supported?: boolean;
  @IsOptional() @IsBoolean() home_supported?: boolean;
  @IsOptional() @IsBoolean() premises_supported?: boolean;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000) price?: number;
  @IsOptional() @IsString() @MaxLength(8) currency?: string;
  @IsOptional() @IsBoolean() available?: boolean;
  @IsOptional() @IsBoolean() insurance_covered?: boolean;
  @IsOptional() @IsString() @MaxLength(500) coverage_notes?: string;
}

export class UpsertDocDto {
  @IsDefined()
  @IsString()
  consultation_type: string;

  @IsDefined()
  @IsString()
  specialty: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  duration_minutes?: number;

  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @IsBoolean()
  insurance_covered?: boolean;
}

export class UpsertDocDto2 {
  @IsOptional()
  @IsString()
  consultation_type?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

}

export class UpsertHcDto {
  @IsOptional() @IsString() service_type?: string;
  @IsOptional() @IsString() service_id?: string;
  @IsOptional() @IsString() name_ar?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) required_skills?: string[];
  @IsOptional() @IsNumber() @Min(0) @Max(24) min_hours?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000) hourly_price?: number;
  @IsOptional() @IsString() @MaxLength(8) currency?: string;
  @IsOptional() @IsBoolean() available?: boolean;
  @IsOptional() @IsBoolean() insurance_covered?: boolean;
  @IsOptional() @IsString() @MaxLength(500) coverage_notes?: string;
}

export class UpsertHcDto2 {
  @IsOptional() @IsString() service_type?: string;
  @IsOptional() @IsString() service_id?: string;
  @IsOptional() @IsString() name_ar?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) required_skills?: string[];
  @IsOptional() @IsNumber() @Min(0) @Max(24) min_hours?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000) hourly_price?: number;
  @IsOptional() @IsString() @MaxLength(8) currency?: string;
  @IsOptional() @IsBoolean() available?: boolean;
  @IsOptional() @IsBoolean() insurance_covered?: boolean;
  @IsOptional() @IsString() @MaxLength(500) coverage_notes?: string;
}

export class UpsertDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['circle', 'polygon'])
  shape?: string;


  @IsOptional()
  @IsObject()
  center?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  radius_km?: number;

  @IsOptional()
  @IsArray()
  polygon?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsString()
  id?: string;

}

export class UpsertDto2 {
  @IsOptional()
  @IsNumber()
  day_of_week?: number;

  // weekly recurring hours: 'HH:MM' (scheduling-engine parseHHMM; DoctorDashboard schedule screen)
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  start_time?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  end_time?: string;

  @IsDefined()
  @IsString()
  service_type: string;

  @IsOptional()
  @IsString()
  id?: string;

}
