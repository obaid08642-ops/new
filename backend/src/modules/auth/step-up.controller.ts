import { Body, Controller, Post, UseGuards, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { StepUpService } from '../../common/step-up.guard';
import { JwtAuthGuard, CurrentUser, SelfService, isPlatformStaffRole } from '../../common/auth.guard';
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
// The signed-in staff member steps up for themselves; both handlers check the
// staff role. Without a declaration the global WriteGuard refuses every write.
@SelfService()
@Controller('auth/step-up')
export class StepUpController {
  constructor(private auth: AuthService, private stepUp: StepUpService) {}

  /**
   * R23: the step-up is for the signed-in staff member (the session), never
   * for whatever email the body names. `identifier` is accepted and ignored
   * so older dashboard builds keep working.
   */
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('issue')
  async issue(@CurrentUser() user: any, @Body() body: StepUpIssueDto) {
    const userId = String(user?.id || user?.sub || '');
    if (!userId || !isPlatformStaffRole(user?.role)) throw new ForbiddenException('staff_only');
    const action = String(body?.action || '').trim();
    if (!action) throw new BadRequestException('action_required');
    if (!body?.response) throw new BadRequestException('response_required');
    // The assertion must be a real, freshly-signed WebAuthn response.
    const token = await this.stepUp.issueFromAssertion(userId, action, body.response);
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
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('options')
  async options(@CurrentUser() user: any) {
    const userId = String(user?.id || user?.sub || '');
    // Every staff role that can reach a @StepUp route (finance approves payouts).
    if (!userId || !isPlatformStaffRole(user?.role)) throw new ForbiddenException('staff_only');
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
