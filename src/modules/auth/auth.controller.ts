import { Body, Controller, Delete, Get, Headers, Param, Post, UseGuards, Req, Res, BadRequestException } from '@nestjs/common';
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
import { AuthService } from './auth.service';
import { JwtAuthGuard, Public, CurrentUser } from '../../common/auth.guard';
import { IsString, IsOptional, MinLength } from 'class-validator';
import { UserRole } from '../../common/enums';

class RegisterDto {
  @IsString() full_name: string;
  @IsOptional() @IsString() phone?: string;
  @IsString() @MinLength(6) password: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() role?: UserRole;
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
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private auth: AuthService) {}

  /** Patient-web bridge: opaque request response prevents account enumeration. */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 600000 } })
  @Post('otp/request')
  patientOtpRequest(@Body() dto: PatientOtpRequestDto) {
    return this.auth.requestPatientOtp(dto.identifier);
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
    const tokens = await this.auth.exchangePatientSession(dto.exchange_token);
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
  @Post('password/reset')
  patientResetPassword(@Body() dto: PatientResetPasswordDto) {
    return this.auth.resetPatientPassword(dto.reset_token, dto.new_password);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // E5-F4 anti brute-force
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // E5-F4 credential brute-force guard
  @Post('login')
  async login(@Body() dto: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Accept email OR phone as a single identifier; backwards-compatible with old { phone }.
    const id = dto?.identifier || dto?.email || dto?.phone || '';
    const result: any = await this.auth.login(id, dto?.password, {
      deviceToken: (req as any).cookies?.[DEVICE_COOKIE],
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
  async verify2fa(@Body() dto: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
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
  heartbeat(@CurrentUser() user: any, @Req() req: Request) {
    return this.auth.deviceHeartbeat(
      user.id,
      (req as any).cookies?.[DEVICE_COOKIE],
      req.headers['user-agent'],
      clientIp(req),
    );
  }

  /** Devices with a live session right now (heartbeat within 5 minutes). */
  @Get('sessions/online')
  onlineSessions(@CurrentUser() user: any) {
    return this.auth.onlineDevices(user.id);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }, @Headers('x-device-id') deviceId?: string) {
    if (!body?.refresh_token) throw new BadRequestException('refresh_token_required');
    return this.auth.refreshToken(body.refresh_token, deviceId);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAll(@CurrentUser() user: any) {
    return this.auth.logoutAllDevices(user.id);
  }

  @Post('consent')
  @UseGuards(JwtAuthGuard)
  async recordConsent(@CurrentUser() user: any, @Body() body: { document_type: string, version: string }) {
    if (!body?.document_type || !body?.version) throw new BadRequestException('document_type and version required');
    // In production this would write to a specialized compliance log DB or collection
    // We update the user profile meta to reflect the latest accepted version for PDPL.
    await this.auth.recordComplianceConsent(user.id, body.document_type, body.version);
    return { ok: true, message: 'consent_recorded' };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('nabd_admin_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    return { success: true };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // E5-F4 SMS-bombing guard
  @Post('send-otp')
  sendOtp(@Body() body: { email?: string; phone?: string; identifier?: string }) {
    const id = body.identifier || body.email || body.phone || '';
    return this.auth.sendOtp(id);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // E5-F4 OTP guessing guard
  @Post('verify-otp')
  verifyOtp(@Body() body: { email?: string; phone?: string; identifier?: string; code: string }) {
    const id = body.identifier || body.email || body.phone || '';
    return this.auth.verifyOtp(id, body.code);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // E5-F4
  @Post('reset-password')
  resetPassword(@Body() body: { email?: string; phone?: string; identifier?: string; password: string; code: string }) {
    const id = body.identifier || body.email || body.phone || '';
    if (!body?.code) throw new BadRequestException('code_required');
    return this.auth.resetPassword(id, body.password, body.code);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('social-login')
  socialLogin(@Body() body: { provider: 'google' | 'apple' | 'x' | 'snapchat'; token: string; email?: string; name?: string }) {
    return this.auth.socialLogin(body);
  }
}
