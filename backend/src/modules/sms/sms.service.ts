import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CircuitBreakerService } from '../../common/circuit-breaker.service';
import axios from 'axios';

/** Per-call HTTP timeout for the SMS provider (ms). Env-overridable for tests. */
export const smsTimeoutMs = () => Number(process.env.SMS_TIMEOUT_MS) || 5000;

/** Rejects after ms so a hung provider fails fast even if the HTTP client ignores its own timeout. */
function rejectAfter<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: any;
  const gate = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new Error('sms_provider_timeout')), ms);
    (t as any)?.unref?.();
  });
  return Promise.race([p, gate]).finally(() => clearTimeout(t)) as Promise<T>;
}

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

  constructor(
    @InjectConnection() private readonly conn: Connection,
    @Optional() private readonly breakers?: CircuitBreakerService,
  ) {}

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
        // Taqnyat Integration — timeout + breaker; an open circuit or a hung
        // provider resolves false fast so OTP flows fall back to email + push.
        // The breaker function is args-driven (never a per-call closure)
        // because breakers are cached by name and reused across calls.
        const ms = smsTimeoutMs();
        const send = async (to: string, code: string): Promise<boolean> => {
          const res = await rejectAfter(axios.post('https://api.taqnyat.sa/v1/messages', {
            recipients: [to],
            body: `Your Nabdah Plus OTP is: ${code}`,
            sender: 'Nabdah'
          }, {
            headers: { Authorization: `Bearer ${process.env.TAQNYAT_API_KEY}` },
            timeout: ms,
          }), ms);
          return res.status === 200 || res.status === 201;
        };
        if (!this.breakers) return await send(phone, otp);
        const breaker = this.breakers.create('sms:taqnyat:send', send, { timeout: ms }, () => false);
        return await breaker.fire(phone, otp);
      }
      return false;
    } catch (e) {
      this.logger.error('SMS delivery failed.', e instanceof Error ? e.stack : undefined);
      return false;
    }
  }
}
