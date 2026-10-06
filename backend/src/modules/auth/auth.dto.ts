import {
  IsArray,
  IsDefined,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Validate,
  ValidateIf,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
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

  @IsOptional()
  @IsString()
  turnstileToken?: string;
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

  @IsOptional()
  @IsString()
  turnstileToken?: string;
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

  @IsOptional()
  @IsString()
  turnstileToken?: string;
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

  @IsOptional()
  @IsString()
  turnstileToken?: string;
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

  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
/**
 * R12.social-xs: Google and Apple send a token the backend verifies itself. X and Snapchat send the
 * OAuth authorization code plus the PKCE verifier, so the SERVER does the exchange with its own
 * client secret; an access token from the device is refused for those two.
 */
const CODE_FLOW = (o: { provider?: unknown }): boolean => o.provider === "x" || o.provider === "snapchat";

@ValidatorConstraint({ name: "socialCodeFlowHasNoToken", async: false })
class SocialCodeFlowConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const o = args.object as Record<string, unknown>;
    // For the code flow the device must not hand over a provider token.
    return CODE_FLOW(o) ? o.token === undefined : true;
  }

  defaultMessage(): string {
    return "x and snapchat sign in with the authorization code, never with a token";
  }
}

export class SocialLoginDto {
  @IsDefined()
  // Q107: only providers the backend can verify itself.
  @Validate(SocialCodeFlowConstraint)
  @IsIn(["google", "apple", "x", "snapchat"])
  provider: "google" | "apple" | "x" | "snapchat";

  /**
   * google / apple only. Left optional on purpose: a token-less google/apple body is rejected by the
   * provider verification in the service, not by the shape of the request.
   */
  @IsOptional()
  @IsString()
  token?: string;

  /** x / snapchat only. */
  @IsDefined()
  @IsString()
  @ValidateIf(CODE_FLOW)
  code?: string;

  /** x / snapchat only. */
  @IsDefined()
  @IsString()
  @ValidateIf(CODE_FLOW)
  code_verifier?: string;

  /** x / snapchat only. */
  @IsDefined()
  @IsString()
  @ValidateIf(CODE_FLOW)
  redirect_uri?: string;

  // R12.social-xs: the email and name in the body are never trusted; kept for Apple only.
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  turnstileToken?: string;
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
