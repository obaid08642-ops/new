import { Body, Controller, Post, UseGuards, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { StepUpService } from '../../common/step-up.guard';
import { CurrentUser, JwtAuthGuard, Public, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

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

  /**
   * Step 1: assertion options (challenge stored server-side) for the SIGNED-IN admin's own
   * registered passkeys. Not public: the user comes from the JWT, never from the body, so an
   * anonymous caller learns nothing about which emails are admins or what credentials they hold.
   */
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('options')
  async options(@CurrentUser() user: any) {
    if (!user?.id) throw new UnauthorizedException('authentication_required');
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('admin_only');
    }
    return this.stepUp.startAssertion(user.id);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('issue')
  async issue(@Body() body: { identifier?: string; action?: string; response?: any }) {
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
}
