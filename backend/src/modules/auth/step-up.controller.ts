import { Body, Controller, Post, UseGuards, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { StepUpService } from '../../common/step-up.guard';
import { JwtAuthGuard, Public, Roles, CurrentUser } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

/** F1/R25: real DTO for the step-up issue body. */
export class StepUpIssueDto {
  @IsOptional() @IsString() @MaxLength(320) identifier?: string;
  @IsOptional() @IsString() @MaxLength(320) action?: string;
  @IsOptional() @IsObject() response?: Record<string, unknown>;
}

/**
 * C4: step-up re-authentication.
 *
 * A sensitive action requires a FRESH passkey assertion (Touch/Face ID), not the
 * admin session alone. The client calls this endpoint with the assertion and the
 * action it wants to perform; the backend verifies the assertion against the
 * stored public key and returns a short-lived, single-use, action-bound token.
 * The sensitive endpoint then requires that token via @StepUp().
 */
@Controller('auth/step-up')
export class StepUpController {
  constructor(private auth: AuthService, private stepUp: StepUpService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('issue')
  async issue(@Body() body: StepUpIssueDto) {
    const identifier = String(body?.identifier || '').trim().toLowerCase();
    const action = String(body?.action || '').trim();
    if (!identifier || !action) throw new BadRequestException('identifier_and_action_required');
    if (!body?.response) throw new BadRequestException('response_required');

    const u: any = await (this.auth as any).userModel.findOne({ email: identifier });
    if (!u || (u.role !== 'admin' && u.role !== 'super_admin')) {
      throw new ForbiddenException('admin_only');
    }
    // The assertion must be a real, freshly-signed WebAuthn response.
    const token = await this.stepUp.issueFromAssertion(u.id, action, body.response);
    return { ok: true, token, action, expires_in: 120 };
  }

  /**
   * R23 — mint the WebAuthn challenge for a step-up ceremony. The admin UI calls
   * this (with its session; no body needed), runs startAuthentication with the
   * returned options, then POSTs the assertion to issue. Admin-only: the issue
   * endpoint re-checks role, but options must not leak credential ids to
   * non-admins, so this route is guarded rather than public.
   */
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('options')
  async options(@CurrentUser() user: any) {
    const userId = String(user?.id || user?.sub || '');
    if (!userId) throw new ForbiddenException('authentication_required');
    const creds = await this.stepUp.credentialIds(userId);
    if (!creds.length) throw new ForbiddenException('no_passkey');
    const challenge = await this.stepUp.storeChallenge(userId);
    return {
      options: {
        challenge,
        rpId: (this.stepUp as any).rpID || undefined,
        allowCredentials: creds.map((c) => ({
          id: c.id,
          type: 'public-key',
          ...(c.transports ? { transports: c.transports } : {}),
        })),
        userVerification: 'preferred',
        timeout: 60000,
      },
    };
  }
}
