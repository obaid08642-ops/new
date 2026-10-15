import { Body, Controller, Delete, Get, Header, Headers, Logger, Optional, Param, Post, Put, UseGuards, Req, Res, BadRequestException } from '@nestjs/common';
import { AuthLoginDto, AuthVerify2faDto, RefreshDto, LogoutDto, RecordConsentDto, SendOtpDto, VerifyOtpDto, ResetPasswordDto, SocialLoginDto, HeartbeatDto, LinkAccountDto, ConfirmAccountLinkDto, CheckoutContactDto, GuestCleanupDto, GuestCapabilitiesDto } from './auth.dto';
import { PresenceService } from '../presence/presence.service';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';

const DEVICE_COOKIE = 'nabd_admin_device';
const PATIENT_ACCESS_COOKIE = 'nabd_patient_access';
const PATIENT_REFRESH_COOKIE = 'nabd_patient_refresh';
const PATIENT_ACCESS_COOKIE_MAX_AGE = 60 * 60 * 1000;
const PATIENT_REFRESH_COOKIE_MAX_AGE = 14 * 24 * 60 * 60 * 1000;
const PATIENT_SESSION_COOKIE_OPTS = (req: Request, maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge,
});
const DEVICE_COOKIE_OPTS = (req: Request) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
});

function clientIp(req: Request): string | undefined {
  const xff = (req.headers['x-forwarded-for'] as string) || '';
  return (xff.split(',')[0] || req.ip || '').trim() || undefined;
}

/**
 * 21.2 — PROOF that the caller is the guest whose data it wants merged.
 *
 * Not an id: a guest account id is visible to the pharmacy, in logs and in
 * screenshots, so accepting one would let anybody who ever saw it claim that
 * guest's cart and orders. The guest's OWN access token is sent instead and is
 * verified with the JwtService; its `sub` must be a live guest and its jti is
 * burned for the merge.
 */
function guestMergeToken(req: Request): string | undefined {
  const raw = req.headers['x-guest-token'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = String(value ?? '').trim();
  return trimmed ? trimmed.slice(0, 4096) : undefined;
}
import { AuthService } from './auth.service';
import { AccountLinkingService } from './account-linking.service';
import { CheckoutContactService } from './checkout-contact.service';
import { GuestCapability, GuestPermissionMatrixService } from './permission-matrix.service';
import { GuestLifecycleService } from './guest-lifecycle.service';
import { JwtAuthGuard, Public, CurrentUser, SelfService, Roles } from '../../common/auth.guard';
import { IsString, IsOptional, MinLength } from 'class-validator';
import { UserRole } from '../../common/enums';

class RegisterDto {
  // Legacy registration payload.
  @IsOptional() @IsString() full_name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsString() @MinLength(6) password: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() role?: UserRole;
  /** F63: OTP code proving ownership of the phone/email (else a prior verified marker is required). */
  @IsOptional() @IsString() otp?: string;

  // Patient Contract V1 payload.
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() identifier?: string;
  @IsOptional() @IsString() locale?: string;
  @IsOptional() consents?: Array<{ policy_id: string; version: string }>;
}
class LoginDto {
  @IsString() phone: string;
  @IsString() password: string;
}
class GuestDto {
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() deviceId?: string;
}
class PatientOtpRequestDto {
  @IsString() identifier: string;
}
class PatientOtpVerifyDto {
  @IsString() identifier: string;
  @IsString() code: string;
  @IsOptional() @IsString() device_id?: string;
}
class PatientSessionExchangeDto {
  @IsString() exchange_token: string;
}
class PatientForgotPasswordDto {
  @IsString() identifier: string;
}
class PatientResetPasswordDto {
  @IsString() reset_token: string;
  @IsString() @MinLength(8) new_password: string;
}
class ConvertGuestDto {
  @IsString() full_name: string;
  @IsString() phone: string;
  @IsString() @MinLength(6) password: string;
  @IsOptional() @IsString() email?: string;
}

@Controller('auth')
@SelfService()
@UseGuards(JwtAuthGuard)
export class AuthController {
  private readonly log = new Logger(AuthController.name);
  constructor(
    private auth: AuthService,
    @Optional() private presence?: PresenceService,
    @Optional() private linking?: AccountLinkingService,
    @Optional() private checkoutContact?: CheckoutContactService,
    @Optional() private guestMatrix?: GuestPermissionMatrixService,
    @Optional() private guestLifecycle?: GuestLifecycleService,
  ) {}

  /** Patient-web bridge: opaque request response prevents account enumeration. */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 600000 } })
  @Post('otp/request')
  patientOtpRequest(@Body() dto: PatientOtpRequestDto, @Req() req: Request) {
    // 16.3: the caller's address bounds how many distinct numbers one caller
    // may target, which is what stops SMS-pumping fan-out.
    return this.auth.requestPatientOtp(dto.identifier, clientIp(req));
  }

  /** Issues an opaque, single-use, 60-second exchange token; never a session token. */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @Post('otp/verify')
  patientOtpVerify(@Body() dto: PatientOtpVerifyDto) {
    return this.auth.verifyPatientOtp(dto.identifier, dto.code, dto.device_id);
  }

  /** Converts the one-time exchange token to HttpOnly cookies without exposing tokens in JSON. */
  @Public()
  @Post('session/exchange')
  async patientSessionExchange(@Body() dto: PatientSessionExchangeDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.exchangePatientSession(dto.exchange_token, guestMergeToken(req));
    res.cookie(PATIENT_ACCESS_COOKIE, tokens.access_token, PATIENT_SESSION_COOKIE_OPTS(req, PATIENT_ACCESS_COOKIE_MAX_AGE));
    res.cookie(PATIENT_REFRESH_COOKIE, tokens.refresh_token, PATIENT_SESSION_COOKIE_OPTS(req, PATIENT_REFRESH_COOKIE_MAX_AGE));
    return { authenticated: true };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 600000 } })
  @Post('password/forgot')
  patientForgotPassword(@Body() dto: PatientForgotPasswordDto) {
    return this.auth.forgotPatientPassword(dto.identifier);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // S-6 password-reset ceiling
  @Post('password/reset')
  patientResetPassword(@Body() dto: PatientResetPasswordDto) {
    return this.auth.resetPatientPassword(dto.reset_token, dto.new_password);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // E5-F4 anti brute-force
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    const isPatientContract = dto.name !== undefined || dto.identifier !== undefined || dto.locale !== undefined || dto.consents !== undefined;
    if (isPatientContract) {
      return this.auth.registerPatientContract({
        name: dto.name as string,
        identifier: dto.identifier as string,
        password: dto.password,
        locale: dto.locale as string,
        consents: dto.consents as Array<{ policy_id: string; version: string }>,
      });
    }
    if (!dto.full_name) throw new BadRequestException('full_name_required');
    return this.auth.register(dto as Required<Pick<RegisterDto, 'full_name' | 'password'>> & RegisterDto, guestMergeToken(req));
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // E5-F4 credential brute-force guard
  @Post('login')
  async login(@Body() dto: AuthLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Accept email OR phone as a single identifier; backwards-compatible with old { phone }.
    const id = dto?.identifier || dto?.email || dto?.phone || '';
    const result: any = await this.auth.login(id, dto?.password, {
      deviceToken: (req as any).cookies?.[DEVICE_COOKIE],
      ua: req.headers['user-agent'],
      ip: clientIp(req),
    }, guestMergeToken(req));
    if (result && result.device_token) {
      res.cookie(DEVICE_COOKIE, result.device_token, DEVICE_COOKIE_OPTS(req));
    }
    if (result && result.token) {
      res.cookie('nabd_admin_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
    }
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('guest')
  guest(@Body() dto: GuestDto, @Headers('x-device-id') deviceId?: string) {
    return this.auth.guest(dto.phone, deviceId);
  }

  @Post('convert-guest')
  convertGuest(@CurrentUser('id') guestUserId: string, @Body() dto: ConvertGuestDto) {
    return this.auth.convertGuest(guestUserId, dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // E5-F4
  @Post('login/verify-2fa')
  async verify2fa(@Body() dto: AuthVerify2faDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const id = dto?.identifier || dto?.email || dto?.phone || '';
    const result: any = await this.auth.verify2fa(id, dto?.code, {
      ua: req.headers['user-agent'],
      ip: clientIp(req),
    });
    if (result && result.device_token) {
      res.cookie(DEVICE_COOKIE, result.device_token, DEVICE_COOKIE_OPTS(req));
    }
    if (result && result.token) {
      res.cookie('nabd_admin_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
    }
    return result;
  }

  @Get('me')
  me(@CurrentUser('id') id: string) {
    return this.auth.me(id);
  }

  // ── Trusted devices & live sessions (admin device management) ──

  /** List this account's trusted (approved) devices. */
  @Get('trusted-devices')
  trustedDevices(@CurrentUser() user: any) {
    return this.auth.listTrustedDevices(user.id);
  }

  /** Revoke a trusted device — it will need full 2FA again on next login. */
  @Delete('trusted-devices/:deviceId')
  revokeTrustedDevice(@CurrentUser() user: any, @Param('deviceId') deviceId: string) {
    return this.auth.revokeTrustedDevice(user.id, deviceId);
  }

  /** Dashboard heartbeat — keeps this device marked as online. */
  @Post('heartbeat')
  heartbeat(@CurrentUser() user: any, @Req() req: Request, @Body() body?: HeartbeatDto) {
    const out = this.auth.deviceHeartbeat(
      user.id,
      (req as any).cookies?.[DEVICE_COOKIE],
      req.headers['user-agent'],
      clientIp(req),
    );
    // Cross-platform online aggregate (admin/analytics/online).
    try {
      const socketId = `http:${(req as any).cookies?.[DEVICE_COOKIE] || 'unknown'}`.slice(0, 48);
      void this.presence?.setOnline?.(user.id, socketId, { platform: body?.client, role: user.role });
    } catch { /* observability only */ }
    return out;
  }

  /** Devices with a live session right now (heartbeat within 5 minutes). */
  @Get('sessions/online')
  onlineSessions(@CurrentUser() user: any) {
    return this.auth.onlineDevices(user.id);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('refresh')
  async refresh(@Body() body: RefreshDto, @Headers('x-device-id') deviceId?: string) {
    if (!body?.refresh_token) throw new BadRequestException('refresh_token_required');
    return this.auth.refreshToken(body.refresh_token, deviceId);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAll(@CurrentUser() user: any) {
    return this.auth.logoutAllDevices(user.id);
  }

  /**
   * 21.7 — sign out of this device: the refresh sessions bound to it are revoked
   * and its push token is removed, so a shared phone stops receiving this
   * account's notifications.
   */
  @Post('logout-device')
  @UseGuards(JwtAuthGuard)
  async logoutDevice(@CurrentUser() user: any, @Headers('x-device-id') deviceId?: string) {
    return this.auth.logoutDevice(user.id, deviceId);
  }

  /** 21.7 — the signed-in devices the user can revoke. */
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async sessions(@CurrentUser() user: any) {
    return { devices: await this.auth.listSessions(user.id) };
  }

  @Post('consent')
  @UseGuards(JwtAuthGuard)
  async recordConsent(@CurrentUser() user: any, @Body() body: RecordConsentDto) {
    if (!body?.document_type || !body?.version) throw new BadRequestException('document_type and version required');
    // In production this would write to a specialized compliance log DB or collection
    // We update the user profile meta to reflect the latest accepted version for PDPL.
    await this.auth.recordComplianceConsent(user.id, body.document_type, body.version);
    return { ok: true, message: 'consent_recorded' };
  }

  /**
   * Sign out: the refresh session of the token sent here is revoked, so a copied refresh token stops working (issue 440).
   * Public: holding the refresh token is what proves the right to end its session, also once the access token expired.
   */
  @Public()
  @Post('logout')
  async logout(@Body() body: LogoutDto, @Res({ passthrough: true }) res: Response) {
    res.clearCookie('nabd_admin_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    const session_revoked = body?.refresh_token ? await this.auth.revokeRefreshSession(body.refresh_token) : false;
    return { success: true, session_revoked };
  }

  // P5.4: legacy names — distinct generic-OTP flow (not aliases of otp/*);
  // kept with deprecation headers. Canonical: otp/request, otp/verify, password/reset.
  @Public()
  @Header('Deprecation', 'true')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // E5-F4 SMS-bombing guard
  @Post('send-otp')
  sendOtp(@Body() body: SendOtpDto, @Req() req: Request) {
    this.log.warn('deprecated auth alias called: send-otp (canonical: otp/request)');
    const id = body.identifier || body.email || body.phone || '';
    return this.auth.sendOtp(id, body.purpose, clientIp(req));
  }

  @Public()
  @Header('Deprecation', 'true')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // E5-F4 OTP guessing guard
  @Post('verify-otp')
  verifyOtp(@Body() body: VerifyOtpDto) {
    this.log.warn('deprecated auth alias called: verify-otp (canonical: otp/verify)');
    const id = body.identifier || body.email || body.phone || '';
    return this.auth.verifyOtp(id, body.code);
  }

  @Public()
  @Header('Deprecation', 'true')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // E5-F4
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    this.log.warn('deprecated auth alias called: reset-password (canonical: password/reset)');
    const id = body.identifier || body.email || body.phone || '';
    if (!body?.code) throw new BadRequestException('code_required');
    return this.auth.resetPassword(id, body.password, body.code);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // S-6 sign-in ceiling
  @Post('social-login')
  socialLogin(@Body() body: SocialLoginDto, @Req() req: Request) {
    return this.auth.socialLogin(body, guestMergeToken(req));
  }

  // ── Phase 21: accounts, guests and verification ──

  /**
   * 21.6 — offer to link this account to another that uses the same address.
   * The proof is minted by the backend: an emailed code for `email`, or a
   * provider session that `socialLogin` verifies for google/apple. The request
   * body carries no proof and never receives the code.
   */
  @Post('link-account')
  linkAccount(@CurrentUser('id') accountId: string, @Body() dto: LinkAccountDto) {
    return this.linking.requestLink(accountId, dto.target_account_id, dto.method, dto.provider_email);
  }

  /** 21.6 — confirm with the code the backend emailed to the address. */
  @Post('confirm-account-link')
  async confirmAccountLink(@CurrentUser('id') accountId: string, @Body() dto: ConfirmAccountLinkDto) {
    await this.linking.confirmLink(dto.linked_account_id, accountId, { kind: 'email_code', code: dto.code });
    return { linked: true, linked_account_id: dto.linked_account_id };
  }

  /** 21.6 — the accounts this one is linked to. */
  @Get('linked-accounts')
  linkedAccounts(@CurrentUser('id') accountId: string) {
    return this.linking.getLinkedAccounts(accountId);
  }

  /**
   * 21.5 — one contact phone field and an address, saved to the profile at
   * checkout. The response shows the phone formatted back for confirmation.
   */
  @Post('checkout-contact')
  storeCheckoutContact(@CurrentUser('id') accountId: string, @Body() dto: CheckoutContactDto) {
    return this.checkoutContact.storeCheckoutContact(accountId, {
      phone: dto.phone,
      address: dto.address,
      label: dto.label,
    });
  }

  /** 21.5 — the cash-on-delivery limits that apply to this account right now. */
  @Get('checkout-contact/cash-limits')
  cashLimits(@CurrentUser('id') accountId: string) {
    return this.checkoutContact.cashOnDeliveryLimits(accountId);
  }

  /** 21.3 — what a guest may do, as the server sees it right now. */
  @Get('guest/capabilities')
  async guestCapabilities() {
    return { capabilities: await this.guestMatrix.matrix() };
  }

  /** 21.3 — the admin edits the matrix; it applies on the next request, no deploy. */
  @Roles(UserRole.ADMIN)
  @Put('admin/guest/capabilities')
  setGuestCapabilities(@CurrentUser('id') adminId: string, @Body() dto: GuestCapabilitiesDto) {
    return this.guestMatrix.setCapabilities(dto.capabilities as Record<GuestCapability, boolean>, adminId);
  }

  /**
   * 21.8 — admin-only guest cleanup. It used to be a public POST, which let
   * anyone trigger the deletion of guest rows.
   */
  @Roles(UserRole.ADMIN)
  @Post('guest/cleanup')
  async cleanupGuests(@Body() dto: GuestCleanupDto) {
    return this.guestLifecycle.purgeInactiveGuests();
  }
}
