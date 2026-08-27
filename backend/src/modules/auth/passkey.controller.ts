import { Body, Controller, Delete, Get, Param, Post, Req, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { PasskeyService } from './passkey.service';
import { JwtAuthGuard, Public, CurrentUser } from '../../common/auth.guard';

/**
 * Passkey management (enrollment) + passkey login verification.
 * NOTE: there is intentionally NO public "start login challenge" route here —
 * login challenges are issued exclusively by POST /auth/login after the
 * password has been verified (strict two-step ordering, no bypass).
 */
@Controller('auth/passkey')
@UseGuards(JwtAuthGuard)
export class PasskeyController {
  constructor(private auth: AuthService, private passkeys: PasskeyService) {}

  @Post('enroll/options')
  enrollOptions(@CurrentUser() user: any) {
    return this.passkeys.startEnrollment(user);
  }

  @Post('enroll/verify')
  enrollVerify(@CurrentUser() user: any, @Body() body: { response: any; device_name?: string }) {
    if (!body?.response) throw new BadRequestException('response_required');
    return this.passkeys.finishEnrollment(user, body.response, body.device_name);
  }

  @Get('devices')
  async devices(@CurrentUser() user: any) {
    await this.passkeys.assertEnrollmentAllowed(user);
    return this.passkeys.listCredentials(user.id);
  }

  @Delete('devices/:credentialId')
  async remove(@CurrentUser() user: any, @Param('credentialId') credentialId: string) {
    await this.passkeys.assertEnrollmentAllowed(user);
    return this.passkeys.removeCredential(user.id, credentialId);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // same anti brute-force budget as /auth/login
  @Post('login/verify')
  async loginVerify(@Body() body: { identifier: string; response: any }, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!body?.identifier || !body?.response) throw new BadRequestException('identifier_and_response_required');
    const xff = (req.headers['x-forwarded-for'] as string) || '';
    const result = await this.auth.completePasskeyLogin(body.identifier, body.response, {
      ua: req.headers['user-agent'],
      ip: (xff.split(',')[0] || req.ip || '').trim() || undefined,
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
