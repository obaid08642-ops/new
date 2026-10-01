import { Body, Controller, Post, UseGuards, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard, Public, CurrentUser } from '../../common/auth.guard';
import { StepUp } from '../../common/step-up.guard';
import { AuthService } from './auth.service';
import { AdminRecoveryService } from './admin-recovery.service';
import { UserRole } from '../../common/enums';

/**
 * C6: break-glass recovery for admin accounts.
 * - Generate: authenticated admin + step-up → 10 plaintext codes (shown once).
 * - Redeem: recovery code + FRESH email OTP together → session.
 *   Email code alone, unknown code, or used code → 403.
 */
@Controller('auth/admin-recovery')
@UseGuards(JwtAuthGuard)
export class AdminRecoveryController {
  constructor(private auth: AuthService, private recovery: AdminRecoveryService) {}

  @StepUp()
  @Post('generate')
  async generate(@CurrentUser() user: any) {
    if (user?.role !== UserRole.ADMIN && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('admin_only');
    }
    const codes = await this.recovery.generate(user.id);
    return { ok: true, codes, warning: 'Store these offline. Each code works once, only with an email code.' };
  }

  /**
   * C6: start recovery by emailing a one-time code to the admin's mailbox.
   *
   * Without this the redeem step is unreachable: it requires an email code, but
   * a locked-out admin cannot log in to request one. The code alone grants
   * nothing — redeem still requires the recovery code too.
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('start')
  async start(@Body() body: { email?: string }) {
    const email = String(body?.email || '').trim().toLowerCase();
    if (!email) throw new BadRequestException('email_required');
    const u: any = await (this.auth as any).userModel.findOne({ email });
    if (!u || (u.role !== UserRole.ADMIN && u.role !== UserRole.SUPER_ADMIN)) {
      // Same answer as a sent code: this endpoint must not reveal which emails
      // are registered admin accounts.
      return { ok: true, channel: 'email' };
    }
    const res = await this.auth.sendOtp(email, 'admin_recovery');
    return { ok: !!res?.ok, channel: res?.channel || 'email' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('redeem')
  async redeem(@Body() body: { email?: string; email_code?: string; recovery_code?: string }) {
    const email = String(body?.email || '').trim().toLowerCase();
    const emailCode = String(body?.email_code || '').trim();
    const recCode = String(body?.recovery_code || '').trim();
    if (!email || !emailCode) throw new BadRequestException('email_and_email_code_required');
    // C7: an email code alone never grants access — missing recovery code is a 403.
    if (!recCode) throw new ForbiddenException('recovery_code_required');
    // 1) Email OTP first — proves control of the mailbox. Alone it grants nothing.
    const u: any = await (this.auth as any).userModel.findOne({ email });
    if (!u || (u.role !== UserRole.ADMIN && u.role !== UserRole.SUPER_ADMIN)) {
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.auth.verifyOtp((this.auth as any).otpContact(u, email), emailCode);
    // 2) Recovery code — single-use. Unknown or used → 403.
    await this.recovery.consume(u.id, recCode);
    u.last_login_at = new Date();
    await u.save();
    return { user: (this.auth as any).publicUser(u), token: (this.auth as any).signToken(u) };
  }
}
