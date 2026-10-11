/**
 * Phase 16.3 — OTP abuse / SMS pumping.
 *
 * An attacker with a botnet can burn the product's SMS budget by asking for
 * codes against thousands of numbers they do not own. The plan's limits, all
 * enforced here so they can be tested in one place:
 *
 *   • at most 5 OTPs per number per hour;
 *   • at most 20 distinct numbers per IP per hour;
 *   • an allow-list of the country codes actually served;
 *   • a daily SMS budget, and once it is spent OTP sends stop rather than
 *     failing silently at the provider.
 *
 * Every refusal is a distinct code, so the live journey can prove each limit
 * instead of inferring it.
 */
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../modules/redis/redis.service';

/** OTPs one phone number may ask for in an hour. */
export const MAX_OTP_PER_NUMBER_PER_HOUR = 5;
/** Distinct phone numbers one IP may target in an hour. */
export const MAX_NUMBERS_PER_IP_PER_HOUR = 20;
/** SMS messages the whole product may send in a day. */
export const DAILY_SMS_BUDGET = 5_000;

const HOUR = 60 * 60;

/** The country codes the product serves. Anything else is refused. */
export const DEFAULT_COUNTRY_ALLOWLIST = ['+966', '+974', '+965', '+968', '+973', '+20', '+212', '+213', '+216', '+233'];

export type OtpAbuseRefusal =
  | 'otp_rate_limited'
  | 'otp_ip_number_limit'
  | 'otp_country_not_served'
  | 'otp_daily_budget_exhausted';

export interface OtpAbuseVerdict {
  allowed: boolean;
  code?: OtpAbuseRefusal;
}

@Injectable()
export class OtpAbuseGuard {
  private readonly logger = new Logger(OtpAbuseGuard.name);

  constructor(private readonly redis: RedisService) {}

  /** The allow-list, overridable by env for a market that adds a country. */
  private allowlist(): string[] {
    const raw = process.env.OTP_COUNTRY_ALLOWLIST;
    if (!raw) return [...DEFAULT_COUNTRY_ALLOWLIST];
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }

  /**
   * Check a request before any code is generated.
   *
   * `identifier` may be an email (unlimited: no SMS cost) or a phone number.
   * Only a phone number consumes SMS budget, so only a phone number is
   * rate-limited here — the existing per-identifier limit still applies to
   * both in AuthService.
   */
  async check(identifier: string, ip?: string): Promise<OtpAbuseVerdict> {
    const isPhone = identifier.trim().startsWith('+');
    if (!isPhone) return { allowed: true };

    if (!this.isServed(identifier)) {
      this.logger.warn(`otp refused: country not served (${identifier.slice(0, 6)}…)`);
      return { allowed: false, code: 'otp_country_not_served' };
    }

    const daily = await this.redis.checkRateLimit('sms:daily_budget', DAILY_SMS_BUDGET, 24 * HOUR);
    if (!daily.allowed) {
      this.logger.error('otp refused: the daily SMS budget is spent');
      return { allowed: false, code: 'otp_daily_budget_exhausted' };
    }

    const perNumber = await this.redis.checkRateLimit(
      `sms:otp:number:${identifier}`,
      MAX_OTP_PER_NUMBER_PER_HOUR,
      HOUR,
    );
    if (!perNumber.allowed) {
      return { allowed: false, code: 'otp_rate_limited' };
    }

    // Per-IP: a distinct set of numbers, so one attacker cannot fan out by
    // asking many numbers in parallel from the same address.
    if (ip) {
      const key = `sms:otp:ip:${ip}:numbers`;
      // Only a first sighting joins the set, so re-asking a number already
      // counted does not refresh its window.
      if (!(await this.redis.sismember(key, identifier))) {
        await this.redis.sadd(key, identifier);
        await this.redis.expire(key, HOUR);
      }
      const distinct = (await this.redis.smembers(key)).length;
      if (distinct > MAX_NUMBERS_PER_IP_PER_HOUR) {
        this.logger.warn(`otp refused: ${ip} targeted ${distinct} distinct numbers this hour`);
        return { allowed: false, code: 'otp_ip_number_limit' };
      }
    }

    return { allowed: true };
  }

  /** True when the number's country code is on the allow-list. */
  isServed(identifier: string): boolean {
    const allow = this.allowlist();
    // Longest prefix first so +9 does not shadow +966.
    return [...allow].sort((a, b) => b.length - a.length).some((cc) => identifier.startsWith(cc));
  }
}