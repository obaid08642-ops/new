import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import axios from 'axios';
import { isChaosFail } from '../../common/chaos-switches';

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

  /**
   * P17-17.9: OTP autofill. When SMS_WEBOTP_HASH is configured (the app's
   * SMS-Retriever app hash from the Play Console signing cert), the body uses
   * the WebOTP format (`<#>` prefix + `@domain #hash` suffix) so Android
   * fills the code without interrupting the user; iOS fills from the numeric
   * code via the client's `one-time-code` field either way. Without a
   * configured hash the previous body is kept byte-identical (clients pin it).
   */
  otpBody(otp: string): string {
    const code = String(otp || '').trim();
    const hash = String(process.env.SMS_WEBOTP_HASH || '').trim();
    const domain = String(process.env.SMS_WEBOTP_DOMAIN || 'nabd.plus').trim() || 'nabd.plus';
    if (!hash) return `Your Nabd+ OTP is: ${code}`;
    return `<#>\nYour Nabd+ OTP is: ${code}\n@${domain} #${hash}`;
  }

  async sendOtp(phone: string, otp: string): Promise<boolean> {
    return this.sendText(phone, this.otpBody(otp));
  }

  /** One text message (an OTP, a password-reset link), through the same switch, chaos drill and provider as the OTP. */
  async sendText(phone: string, text: string): Promise<boolean> {
    // 15.11 chaos drill: force the documented fallback (false, i.e. email+push)
    // before the enabled-check and before any provider HTTP call, so the drill
    // asserts the real degraded path rather than a provider error. Never in
    // production.
    if (isChaosFail('sms')) {
      this.logger.log('CHAOS_FAIL_SMS=1: chaos drill, no SMS message was sent.');
      return false;
    }
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
          body: text,
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
