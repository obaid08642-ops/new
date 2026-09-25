import { IsArray, IsDefined, IsIn, IsOptional, IsString } from 'class-validator';

export class RegisterDto {
  @IsDefined()
  @IsString()
  email: string;

  @IsDefined()
  password: any;

  @IsDefined()
  confirm_password: any;

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
  password: any;

  @IsOptional()
  meta?: any;

}

export class RefreshDto {
  @IsDefined()
  refresh_token: any;

  @IsDefined()
  device_identifier: any;

  @IsDefined()
  session_id: any;

  @IsOptional()
  meta?: any;

}

export class LogoutDto {
  @IsDefined()
  session_id: any;

  @IsOptional()
  meta?: any;

}

export class SendOtpDto {
  @IsDefined()
  purpose: any;

  @IsDefined()
  email: any;

  @IsOptional()
  meta?: any;

}

export class VerifyEmailDto {
  @IsDefined()
  @IsString()
  email: string;

  @IsDefined()
  code: any;

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
  code: any;

  @IsOptional()
  meta?: any;

}

export class ResetDto {
  @IsDefined()
  @IsString()
  email: string;

  @IsDefined()
  code: any;

  @IsDefined()
  new_password: any;

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
  full_name?: any;

  @IsOptional()
  phone?: any;

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
  note?: any;

  @IsOptional()
  commission_cash?: any;

  @IsOptional()
  commission?: any;

  @IsOptional()
  commission_insurance?: any;

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
  note?: any;

  @IsOptional()
  scheduled_at?: any;

}

export class RejectDto2 {
  @IsOptional()
  reason?: any;

  @IsOptional()
  note?: any;

}

export class StartDto {
  @IsOptional()
  note?: any;

}

export class CompleteDto {
  @IsOptional()
  note?: any;

}

export class CancelDto {
  @IsOptional()
  reason?: any;

  @IsOptional()
  note?: any;

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
  @IsOptional()
  consultation_type?: any;

  @IsOptional()
  specialty?: any;

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
  shape?: any;

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
