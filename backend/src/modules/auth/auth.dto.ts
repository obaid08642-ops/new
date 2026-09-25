import { IsDefined, IsIn, IsOptional, IsString } from 'class-validator';

export class AuthLoginDto {
  @IsOptional()
  identifier?: any;

  @IsOptional()
  email?: any;

  @IsOptional()
  phone?: any;

  @IsOptional()
  password?: any;

}

export class AuthVerify2faDto {
  @IsOptional()
  identifier?: any;

  @IsOptional()
  email?: any;

  @IsOptional()
  phone?: any;

  @IsOptional()
  code?: any;

}

export class RefreshDto {
  @IsDefined()
  @IsString()
  refresh_token: string;
}
export class RecordConsentDto {
  @IsDefined()
  @IsString()
  document_type: string;

  @IsDefined()
  @IsString()
  version: string;
}
export class SendOtpDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  identifier?: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}
export class VerifyOtpDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  identifier?: string;

  @IsDefined()
  @IsString()
  code: string;
}
export class ResetPasswordDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  identifier?: string;

  @IsDefined()
  @IsString()
  password: string;

  @IsDefined()
  @IsString()
  code: string;
}
export class SocialLoginDto {
  @IsDefined()
  @IsIn(["x", "google", "apple", "snapchat"])
  provider: "x" | "google" | "apple" | "snapchat";

  @IsDefined()
  @IsString()
  token: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

}
