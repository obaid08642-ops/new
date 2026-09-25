import { IsArray, IsBoolean, IsDefined, IsEnum, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
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
  meta?: any;

}

export class LoginDto {
  @IsDefined()
  @IsString()
  email: string;

  @IsDefined()
  @IsIn(["string"])
  password: string;


  @IsOptional()
  meta?: any;

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
  meta?: any;

}

export class LogoutDto {
  @IsDefined()
  @IsString()
  session_id: string;


  @IsOptional()
  meta?: any;

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
  meta?: any;

}

export class ForgotDto {
  @IsDefined()
  @IsString()
  email: string;

  @IsOptional()
  meta?: any;

}

export class VerifyResetCodeDto {
  @IsDefined()
  @IsString()
  email: string;

  @IsDefined()
  @IsString()
  code: string;


  @IsOptional()
  meta?: any;

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
  meta?: any;

}

export class AddPhoneDto {
  @IsOptional()
  @IsArray()
  number?: any[];

  @IsOptional()
  type?: any;

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
  doc_type?: any;

  @IsDefined()
  file: any;

  @IsOptional()
  doc_number?: any;

  @IsOptional()
  issuer?: any;

  @IsDefined()
  issued_date: any;

  @IsDefined()
  expiry_date: any;

}

export class UpsertBankDto {
  @IsOptional()
  bank_code?: any;

  @IsOptional()
  holder_name?: any;

  @IsOptional()
  iban?: any;

  @IsOptional()
  vat_number?: any;

}

export class SubmitDeltaDto {
  @IsOptional()
  @IsIn(["object"])
  changes?: string;

  @IsOptional()
  @IsIn(["object"])
  newData?: string;

}

export class SubmitDeltaDto2 {
  @IsOptional()
  @IsIn(["object"])
  changes?: string;

  @IsOptional()
  @IsIn(["object"])
  newData?: string;

}

export class InviteDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  role?: any;

  @IsDefined()
  @IsArray()
  permissions: any[];

  @IsOptional()
  full_name?: any;

  @IsOptional()
  phone?: any;

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
  role?: any;

  @IsDefined()
  @IsArray()
  permissions: any[];

  @IsOptional()
  full_name?: any;

  @IsOptional()
  phone?: any;

}

export class RejectDeltaDto {
  @IsOptional()
  reason?: any;

}

export class RejectDeltaDto2 {
  @IsOptional()
  reason?: any;

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
  reason?: any;

}

export class NeedsChangesDto {
  @IsOptional()
  note?: any;

  @IsOptional()
  docs_needing_replacement?: any;

}

export class SuspendDto {
  @IsOptional()
  reason?: any;

}

export class ReactivateDto {
  @IsOptional()
  reason?: any;

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
  sku?: any;

  @IsOptional()
  name_ar?: any;

  @IsOptional()
  stock?: any;

  @IsOptional()
  min_stock_alert?: any;

  @IsOptional()
  last_restocked_at?: any;

}

export class UpsertLabDto {
  @IsOptional()
  code?: any;

  @IsOptional()
  name_ar?: any;

}

export class UpsertLabDto2 {
  @IsOptional()
  code?: any;

  @IsOptional()
  name_ar?: any;

}

export class UpsertRadDto {
  @IsOptional()
  scan_type?: any;

  @IsOptional()
  body_part?: any;

}

export class UpsertRadDto2 {
  @IsOptional()
  scan_type?: any;

  @IsOptional()
  body_part?: any;

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
  consultation_type?: any;

  @IsOptional()
  specialty?: any;

}

export class UpsertHcDto {
  @IsOptional()
  service_type?: any;

}

export class UpsertHcDto2 {
  @IsOptional()
  service_type?: any;

}

export class UpsertDto {
  @IsOptional()
  name?: any;

  @IsOptional()
  @IsString()
  shape?: string;


  @IsOptional()
  @IsIn(["circle"])
  center?: string;

  @IsOptional()
  @IsIn(["circle"])
  radius_km?: string;

  @IsDefined()
  @IsIn(["polygon"])
  polygon: string;

  @IsOptional()
  id?: any;

}

export class UpsertDto2 {
  @IsOptional()
  day_of_week?: any;

  @IsOptional()
  start_time?: any;

  @IsOptional()
  end_time?: any;

  @IsDefined()
  @IsIn(["string"])
  service_type: string;

  @IsOptional()
  id?: any;

}
