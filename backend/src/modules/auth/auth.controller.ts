import { Body, Controller, Get, Post, UseGuards, Req, Res, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
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

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  async login(@Body() dto: any, @Res({ passthrough: true }) res: Response) {
    // Accept email OR phone as a single identifier; backwards-compatible with old { phone }.
    const id = dto?.identifier || dto?.email || dto?.phone || '';
    const result = await this.auth.login(id, dto?.password);
    if ('token' in result && result.token) {
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
  @Post('guest')
  guest(@Body() dto: GuestDto) {
    return this.auth.guest(dto.phone);
  }

  @Post('convert-guest')
  convertGuest(@CurrentUser('id') guestUserId: string, @Body() dto: ConvertGuestDto) {
    return this.auth.convertGuest(guestUserId, dto);
  }

  @Public()
  @Post('login/verify-2fa')
  async verify2fa(@Body() dto: any, @Res({ passthrough: true }) res: Response) {
    const id = dto?.identifier || dto?.email || dto?.phone || '';
    const result = await this.auth.verify2fa(id, dto?.code);
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

  @Public()
  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }) {
    if (!body?.refresh_token) throw new BadRequestException('refresh_token_required');
    return this.auth.refreshToken(body.refresh_token);
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
  @Post('send-otp')
  sendOtp(@Body() body: { email?: string; phone?: string; identifier?: string }) {
    const id = body.identifier || body.email || body.phone || '';
    return this.auth.sendOtp(id);
  }

  @Public()
  @Post('verify-otp')
  verifyOtp(@Body() body: { email?: string; phone?: string; identifier?: string; code: string }) {
    const id = body.identifier || body.email || body.phone || '';
    return this.auth.verifyOtp(id, body.code);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() body: { email?: string; phone?: string; identifier?: string; password: string; code: string }) {
    const id = body.identifier || body.email || body.phone || '';
    if (!body?.code) throw new BadRequestException('otp_code_required');
    return this.auth.resetPassword(id, body.password, body.code);
  }

  @Public()
  @Post('social-login')
  socialLogin(@Body() body: { provider: 'google' | 'apple' | 'x' | 'snapchat'; token: string; email?: string; name?: string }) {
    return this.auth.socialLogin(body);
  }
}
