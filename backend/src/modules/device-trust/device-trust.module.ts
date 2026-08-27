/**
 * Device Trust — Play Integrity API (Android) + App Attest (iOS).
 *
 * Production flow:
 *   1. App requests an attestation challenge from POST /device-trust/challenge.
 *   2. Client gets a token from Google Play Integrity / Apple DeviceCheck.
 *   3. Client submits it to POST /device-trust/verify — backend validates
 *      server-side and stamps the session as trusted (30d).
 *
 * Keys (placeholders until provided — verification reports not_configured):
 *   PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON  — Google Cloud service account
 *   APNS_KEY_ID / APNS_TEAM_ID / APNS_AUTH_KEY / APNS_BUNDLE_ID — Apple App Attest
 */
import { Module, Injectable, Controller, Post, Get, Body, UseGuards, Logger, BadRequestException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as crypto from 'crypto';
import { JwtAuthGuard, CurrentUser, Public } from '../../common/auth.guard';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class DeviceTrustService {
  private readonly logger = new Logger('DeviceTrust');
  constructor(
    private readonly redis: RedisService,
    @InjectConnection() private readonly conn: Connection,
  ) {}

  private client() { return (this.redis as any).getClient?.(); }

  /** One-time attestation challenge (10 min TTL). */
  async challenge(userId: string, platform: 'android' | 'ios') {
    const nonce = crypto.randomBytes(24).toString('base64url');
    const c = this.client();
    if (c) await c.set(`attest:${platform}:${nonce}`, userId || 'guest', 'EX', 600);
    return { nonce, platform, ttl_seconds: 600 };
  }

  /** Verify an attestation token. Real validation when keys exist; explicit otherwise. */
  async verify(userId: string, body: { platform: 'android' | 'ios'; token: string; nonce: string }) {
    if (!body?.platform || !body?.token || !body?.nonce) {
      throw new BadRequestException('platform, token, nonce are required');
    }

    // Consume the challenge
    const c = this.client();
    if (c) {
      const owner = await c.get(`attest:${body.platform}:${body.nonce}`);
      if (!owner) throw new BadRequestException('challenge_expired_or_invalid');
      await c.del(`attest:${body.platform}:${body.nonce}`);
    }

    let verdict: { trusted: boolean; reason: string; signals?: any };

    if (body.platform === 'android') {
      verdict = await this.verifyPlayIntegrity(body.token);
    } else {
      verdict = await this.verifyAppAttest(body.token);
    }

    if (verdict.trusted) {
      // Stamp the device session as trusted for 30 days
      if (c && userId) await c.set(`trusted:${userId}:${body.platform}`, '1', 'EX', 30 * 24 * 3600);
      await this.conn.collection('security_events').insertOne({
        type: 'device.trusted', user_id: userId, platform: body.platform, createdAt: new Date(),
      });
    }
    return verdict;
  }

  /** Google Play Integrity — server-side decode when service account is configured. */
  private async verifyPlayIntegrity(token: string): Promise<{ trusted: boolean; reason: string; signals?: any }> {
    const saJson = process.env.PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON;
    if (!saJson) {
      return { trusted: false, reason: 'play_integrity_not_configured', signals: { placeholder: true } };
    }
    try {
      // Play Integrity tokens are JWTs — verification requires Google API call.
      // Structure implemented; activates fully with the service account key.
      const { GoogleAuth } = require('google-auth-library');
      const auth = new GoogleAuth({ credentials: JSON.parse(saJson), scopes: ['https://www.googleapis.com/auth/playintegrity'] });
      const client = await auth.getClient();
      const pkg = process.env.PLAY_INTEGRITY_PACKAGE || 'com.nabd.patient';
      const resp = await client.request({
        url: `https://playintegrity.googleapis.com/v1/${pkg}:decodeIntegrityToken`,
        method: 'POST',
        data: { integrity_token: token },
      });
      const payload: any = resp.data?.tokenPayloadExternal || {};
      const ok =
        payload.appIntegrity?.appRecognitionVerdict === 'PLAY_RECOGNIZED' &&
        payload.deviceIntegrity?.deviceRecognitionVerdict?.includes('MEETS_DEVICE_INTEGRITY') &&
        payload.requestDetails?.requestPackageName === pkg;
      return {
        trusted: !!ok,
        reason: ok ? 'play_integrity_ok' : 'play_integrity_verdict_failed',
        signals: {
          app: payload.appIntegrity?.appRecognitionVerdict,
          device: payload.deviceIntegrity?.deviceRecognitionVerdict,
          licensing: payload.accountDetails?.appLicensingVerdict,
        },
      };
    } catch (e: any) {
      this.logger.error(`Play Integrity verify error: ${e.message}`);
      return { trusted: false, reason: `play_integrity_error` };
    }
  }

  /** Apple App Attest / DeviceCheck — structure with APNS key placeholders. */
  private async verifyAppAttest(token: string): Promise<{ trusted: boolean; reason: string; signals?: any }> {
    const configured = !!(process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_AUTH_KEY);
    if (!configured) {
      return { trusted: false, reason: 'app_attest_not_configured', signals: { placeholder: true } };
    }
    // App Attest assertion validation (CBOR + Apple cert chain) activates with keys.
    return { trusted: false, reason: 'app_attest_pending_keys' };
  }

  /** Is this user's device currently trusted? (used by sensitive endpoints) */
  async isTrusted(userId: string, platform: string): Promise<boolean> {
    const c = this.client();
    if (!c || !userId) return false;
    return !!(await c.get(`trusted:${userId}:${platform}`));
  }
}

@Controller('device-trust')
export class DeviceTrustController {
  constructor(private readonly svc: DeviceTrustService) {}

  @Post('challenge')
  @UseGuards(JwtAuthGuard)
  challenge(@CurrentUser() u: any, @Body() body: { platform: 'android' | 'ios' }) {
    return this.svc.challenge(u?.id, body?.platform || 'android');
  }

  @Public()
  @Post('challenge-guest')
  guestChallenge(@Body() body: { platform: 'android' | 'ios' }) {
    return this.svc.challenge('guest', body?.platform || 'android');
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  verify(@CurrentUser() u: any, @Body() body: any) {
    return this.svc.verify(u?.id, body);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async status(@CurrentUser() u: any) {
    const [android, ios] = await Promise.all([
      this.svc.isTrusted(u?.id, 'android'),
      this.svc.isTrusted(u?.id, 'ios'),
    ]);
    return { user_id: u?.id, android_trusted: android, ios_trusted: ios };
  }
}

@Module({
  controllers: [DeviceTrustController],
  providers: [DeviceTrustService],
  exports: [DeviceTrustService],
})
export class DeviceTrustModule {}
