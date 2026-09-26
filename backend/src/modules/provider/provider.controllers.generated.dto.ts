import { IsArray, IsBoolean, IsDateString, IsDefined, IsEnum, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
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

export class RejectDeltaDto2 {
  @IsOptional()
  @IsString()
  reason?: string;

}

export class ApproveDto {
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

export class ReactivateDto {
  @IsOptional()
  @IsString()
  reason?: string;

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
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsOptional()
  @IsNumber()
  stock?: number;

  @IsOptional()
  @IsNumber()
  min_stock_alert?: number;

  @IsOptional()
  @IsDateString()
  last_restocked_at?: string;

}

export class UpsertLabDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name_ar?: string;

}

export class UpsertLabDto2 {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name_ar?: string;

}

export class UpsertRadDto {
  @IsOptional()
  @IsString()
  scan_type?: string;

  @IsOptional()
  @IsString()
  body_part?: string;

}

export class UpsertRadDto2 {
  @IsOptional()
  @IsString()
  scan_type?: string;

  @IsOptional()
  @IsString()
  body_part?: string;

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
  @IsOptional()
  @IsString()
  service_type?: string;

}

export class UpsertHcDto2 {
  @IsOptional()
  @IsString()
  service_type?: string;

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

  @IsOptional()
  @IsDateString()
  start_time?: string;

  @IsOptional()
  @IsDateString()
  end_time?: string;

  @IsDefined()
  @IsString()
  service_type: string;

  @IsOptional()
  @IsString()
  id?: string;

}
