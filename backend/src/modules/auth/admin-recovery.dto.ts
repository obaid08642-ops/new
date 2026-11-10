import { IsDefined, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

/** POST /admin/auth/recovery/start: the admin's mailbox that gets the one-time code. */
export class AdminRecoveryStartDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  email: string;
}

/** POST /admin/auth/recovery/redeem: the emailed code plus the single-use recovery code. */
export class AdminRecoveryRedeemDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  email_code: string;

  // optional on purpose: the handler answers a missing recovery code with its own 403 `recovery_code_required` (an email code alone never grants access)
  @IsOptional()
  @IsString()
  recovery_code?: string;
}

/** POST /admin/auth/step-up/issue: the WebAuthn assertion for one admin action. */
export class StepUpIssueDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  action: string;

  // free-form: the WebAuthn authentication response (credential JSON) from the browser; its shape is checked by the passkey library (issueFromAssertion), not here
  @IsDefined()
  @IsObject()
  response: Record<string, unknown>;
}
