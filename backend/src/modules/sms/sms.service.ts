import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import axios from 'axios';

/**
 * SMS channel — DISABLED by default for the current phase.
 *
 * Enable hierarchy (highest wins):
 *   1. Feature flag `sms_enabled` in the featureflags collection
 *      → toggled from the ADMIN DASHBOARD at runtime, no code change.
 *   2. Env SMS_ENABLED=true  → static default until a flag exists.
 *
 * When disabled, every send*() is a logged no-op returning false, and
 * OTP/verification flows fall back to email + push (handled by callers).
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(@InjectConnection() private readonly conn: Connection) {}

  private get flags() { return this.conn.collection('featureflags'); }

  /** Is the SMS channel currently enabled? (flag overrides env; default OFF) */
  async isEnabled(): Promise<boolean> {
    try {
      const flag = await this.flags.findOne({ key: 'sms_enabled' });
      if (flag) return !!flag.enabled;
    } catch { /* fall back to env */ }
    return process.env.SMS_ENABLED === 'true';
  }

  async sendOtp(phone: string, otp: string): Promise<boolean> {
    if (!(await this.isEnabled())) {
      this.logger.log('SMS delivery is disabled; no SMS message was sent.');
      return false;
    }
    if (!process.env.UNIFONIC_APP_ID && !process.env.TAQNYAT_API_KEY && !process.env.INFOBIP_API_KEY) {
      this.logger.warn('SMS provider is not configured; delivery failed closed.');
      return false;
    }

    try {
      if (process.env.TAQNYAT_API_KEY) {
        // Taqnyat Integration
        const res = await axios.post('https://api.taqnyat.sa/v1/messages', {
          recipients: [phone],
          body: `Your Nabdah Plus OTP is: ${otp}`,
          sender: 'Nabdah'
        }, {
          headers: { Authorization: `Bearer ${process.env.TAQNYAT_API_KEY}` }
        });
        return res.status === 200 || res.status === 201;
      }
      return false;
    } catch (e) {
      this.logger.error('SMS delivery failed.', e instanceof Error ? e.stack : undefined);
      return false;
    }
  }
}
