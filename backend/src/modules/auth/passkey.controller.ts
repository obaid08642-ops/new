import { Body, Controller, Delete, Get, Param, Post, Req, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { PasskeyService } from './passkey.service';
import { PasskeyEnrollVerifyDto, PasskeyLoginVerifyDto } from './auth.dto';
import { JwtAuthGuard, Public, CurrentUser, SelfService } from '../../common/auth.guard';

/**
 * Passkey management (enrollment) + passkey login verification.
 * NOTE: there is intentionally NO public "start login challenge" route here —
 * login challenges are issued exclusively by POST /auth/login after the
 * password has been verified (strict two-step ordering, no bypass).
 */
@Controller('auth/passkey')
@SelfService()
@UseGuards(JwtAuthGuard)
export class PasskeyController {
  constructor(private auth: AuthService, private passkeys: PasskeyService) {}

  @Get('eligibility')
  eligibility(@CurrentUser() user: any) {
    return this.passkeys.isEligible(user);
  }

  @Post('enroll/options')
  async enrollOptions(@CurrentUser() user: any) {
    const existing = await this.passkeys.countCredentials(user.id);
    return this.passkeys.startEnrollment(user, existing > 0);
  }

  @Post('enroll/verify')
  async enrollVerify(@CurrentUser() user: any, @Body() body: PasskeyEnrollVerifyDto) {
    if (!body?.response) throw new BadRequestException('response_required');
    const existing = await this.passkeys.countCredentials(user.id);
    return this.passkeys.finishEnrollment(user, body.response, body.device_name, existing > 0);
  }

  @Get('devices')
  async devices(@CurrentUser() user: any) {
    await this.passkeys.assertEnrollmentAllowed(user);
    return this.passkeys.listCredentials(user.id);
  }

  @Delete('devices/:credentialId')
  async remove(@CurrentUser() user: any, @Param('credentialId') credentialId: string) {
    await this.passkeys.assertEnrollmentAllowed(user, true);
    return this.passkeys.removeCredential(user.id, credentialId);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // same anti brute-force budget as /auth/login
  @Post('login/verify')
  async loginVerify(@Body() body: PasskeyLoginVerifyDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!body?.identifier || !body?.response) throw new BadRequestException('identifier_and_response_required');
    const xff = (req.headers['x-forwarded-for'] as string) || '';
    const result = await this.auth.completePasskeyLogin(body.identifier, body.response, {
      ua: req.headers['user-agent'],
      ip: (xff.split(',')[0] || req.ip || '').trim() || undefined,
      deviceId: body.device_id,
      deviceName: body.device_name,
    });
    if (result && result.device_token) {
      res.cookie('nabd_admin_device', result.device_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
      });
    }
    if (result && result.token) {
      res.cookie('nabd_admin_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }
    return result;
  }
}
