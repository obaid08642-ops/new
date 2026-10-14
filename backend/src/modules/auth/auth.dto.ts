import { IsArray, IsDefined, IsEmail, IsIn, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
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
  // Q107: only providers whose tokens the backend can verify.
  @IsIn(["google", "apple"])
  provider: "google" | "apple";

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

  @IsOptional()
  @IsString()
  device_id?: string;

  @IsOptional()
  @IsString()
  device_name?: string;
}

export class HeartbeatDto {
  @IsOptional()
  @IsString()
  client?: string;
}

/* ------------------------------------------------------------------ *
 * Phase 21 — accounts, guests and verification
 *
 * The shape rules are here; the VALUE rules live where they can be strict
 * about it: the phone is validated with libphonenumber (CheckoutContactService)
 * and the linking code is generated and checked by AccountLinkingService, so the
 * DTO never has to accept a half-valid string.
 * ------------------------------------------------------------------ */

/** 21.6 — offer to link two accounts that share a proven identity. */
export class LinkAccountDto {
  /** The account to link to; the caller proves it at confirm time. */
  @IsDefined()
  @IsString()
  target_account_id: string;

  @IsDefined()
  @IsIn(['email', 'google', 'apple'])
  method: 'email' | 'google' | 'apple';

  /** The address the provider (or the emailed code) says belongs to both. */
  @IsDefined()
  @IsEmail()
  provider_email: string;
}

/** 21.6 — confirm a pending link with the code the backend emailed. */
export class ConfirmAccountLinkDto {
  @IsDefined()
  @IsString()
  linked_account_id: string;

  @IsDefined()
  @IsString()
  @MaxLength(16)
  code: string;
}

/** 21.5 — one contact phone field and an optional address at checkout. */
export class CheckoutContactDto {
  @IsDefined()
  @IsString()
  @MaxLength(32)
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  label?: string;
}

/** 21.8 — the admin's manual guest cleanup. */
export class GuestCleanupDto {
  /** Optional explicit cutoff; the service default (12 months) is used otherwise. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  retention_days?: number;
}

/** 21.3 — the admin edits the guest permission matrix without a deploy. */
export class GuestCapabilitiesDto {
  @IsDefined()
  @IsObject()
  capabilities: Record<string, boolean>;
}
