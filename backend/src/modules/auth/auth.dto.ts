import { IsArray, IsDefined, IsIn, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type {
  AuthenticationExtensionsClientOutputs,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';

export class AttestationResponseDto {
  @IsDefined()
  @IsString()
  clientDataJSON: string;

  @IsDefined()
  @IsString()
  attestationObject: string;

  @IsOptional()
  @IsString()
  authenticatorData?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transports?: AuthenticatorTransportFuture[];
}

export class AssertionResponseDto {
  @IsDefined()
  @IsString()
  clientDataJSON: string;

  @IsDefined()
  @IsString()
  authenticatorData: string;

  @IsDefined()
  @IsString()
  signature: string;

  @IsOptional()
  @IsString()
  userHandle?: string;
}

export class RegistrationCredentialDto {
  @IsDefined()
  @IsString()
  id: string;

  @IsDefined()
  @IsString()
  rawId: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => AttestationResponseDto)
  response: AttestationResponseDto;

  @IsOptional()
  @IsIn(['cross-platform', 'platform'])
  authenticatorAttachment?: 'cross-platform' | 'platform';

  @IsDefined()
  @IsObject()
  clientExtensionResults: AuthenticationExtensionsClientOutputs;

  @IsDefined()
  @IsIn(['public-key'])
  type: 'public-key';
}

export class AuthenticationCredentialDto {
  @IsDefined()
  @IsString()
  id: string;

  @IsDefined()
  @IsString()
  rawId: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => AssertionResponseDto)
  response: AssertionResponseDto;

  @IsOptional()
  @IsIn(['cross-platform', 'platform'])
  authenticatorAttachment?: 'cross-platform' | 'platform';

  @IsDefined()
  @IsObject()
  clientExtensionResults: AuthenticationExtensionsClientOutputs;

  @IsDefined()
  @IsIn(['public-key'])
  type: 'public-key';
}

export class AuthLoginDto {
  @IsOptional()
  @IsString()
  identifier?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  password?: string;

}

export class AuthVerify2faDto {
  @IsOptional()
  @IsString()
  identifier?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  code?: string;

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

export class PasskeyEnrollVerifyDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => RegistrationCredentialDto)
  response: RegistrationCredentialDto;

  @IsOptional()
  @IsString()
  device_name?: string;
}

export class PasskeyLoginVerifyDto {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => AuthenticationCredentialDto)
  response: AuthenticationCredentialDto;
}

export class HeartbeatDto {
  @IsOptional()
  @IsString()
  client?: string;
}
