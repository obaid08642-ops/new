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
 *   • a daily SMS budget, checked LAST and only spent when an SMS is really
 *     sent, so a refused or undelivered message costs nothing.
 *
 * Every refusal is a distinct code, so the live journey can prove each limit
 * instead of inferring it.
 */
import { Injectable, Logger } from '@nestjs/common';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';
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

/** Region assumed for a number written in national form with no country. */
const DEFAULT_REGION = (process.env.OTP_DEFAULT_REGION || 'SA') as CountryCode;

export type OtpAbuseRefusal =
  | 'otp_invalid_identifier'
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
   * Reduce any phone spelling to E.164, or null when it is not a phone.
   *
   * This runs BEFORE any limit is consulted. A limit keyed on the raw string
   * would be trivially bypassed: `0501234567`, `050 123 4567`, `00966501234567`
   * and `+966501234567` are the same number, and an attacker would simply
   * rotate the spelling to get a fresh counter each time.
   *
   * Accepts `+966501234567`, `966501234567`, `00966501234567`, `0501234567`,
   * `5 0123 4567` and the same with dashes or dots. Returns null for anything
   * that is not a usable number, rather than passing the raw string on.
   */
  toE164(input: string): string | null {
    if (typeof input !== 'string') return null;
    // Spaces, dashes, dots, slashes and brackets are decoration.
    const cleaned = input.trim().replace(/[\s\-./()[\]]/g, '');
    if (!cleaned) return null;

    let digits = cleaned;
    // Already in E.164 form; the rest of the checks work on bare digits.
    if (digits.startsWith('+')) digits = digits.slice(1);
    // 00 is the international access prefix; the rest is already country-first.
    if (digits.startsWith('00')) digits = digits.slice(2);
    // A leading national trunk zero is only meaningful with a country, and the
    // product is Saudi-first, so 05… means +9665….
    if (digits.startsWith('0')) digits = `966${digits.slice(1)}`;
    if (!/^\d{7,15}$/.test(digits)) return null;

    // Digits with no trunk zero are parsed as a country-first number.
    const parsed = parsePhoneNumberFromString(`+${digits}`);
    if (!parsed?.isValid()) return null;
    return parsed.number;
  }

  /**
   * Check a request before any code is generated.
   *
   * An email identifier costs no SMS and is never refused here; the existing
   * per-identifier limit in AuthService still applies to it.
   */
  async check(identifier: string, ip?: string): Promise<OtpAbuseVerdict> {
    if (identifier.includes('@')) return { allowed: true };

    // Normalise first: every limit below is keyed on the canonical E.164 form.
    const e164 = this.toE164(identifier);
    if (!e164) {
      this.logger.warn(`otp refused: "${identifier.slice(0, 24)}" is not a usable phone number`);
      return { allowed: false, code: 'otp_invalid_identifier' };
    }

    if (!this.isServed(e164)) {
      this.logger.warn(`otp refused: country not served (${e164.slice(0, 6)}…)`);
      return { allowed: false, code: 'otp_country_not_served' };
    }

    const perNumber = await this.redis.checkRateLimit(
      `sms:otp:number:${e164}`,
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
      if (!(await this.redis.sismember(key, e164))) {
        await this.redis.sadd(key, e164);
        await this.redis.expire(key, HOUR);
      }
      const distinct = (await this.redis.smembers(key)).length;
      if (distinct > MAX_NUMBERS_PER_IP_PER_HOUR) {
        this.logger.warn(`otp refused: ${ip} targeted ${distinct} distinct numbers this hour`);
        return { allowed: false, code: 'otp_ip_number_limit' };
      }
    }

    // The daily budget is checked LAST, and `check` only READS it. Spending it
    // is `recordSmsSent`, called after a message is really delivered, so a
    // refused request never burns the budget.
    const remaining = await this.remainingDailyBudget();
    if (remaining <= 0) {
      this.logger.error('otp refused: the daily SMS budget is spent');
      return { allowed: false, code: 'otp_daily_budget_exhausted' };
    }

    return { allowed: true };
  }

  /** SMS still available today. Read-only: it does not consume anything. */
  async remainingDailyBudget(): Promise<number> {
    const used = await this.redis.get('sms:daily_budget:used');
    const n = Number(used ?? 0);
    return Math.max(0, DAILY_SMS_BUDGET - (Number.isFinite(n) ? n : 0));
  }

  /**
   * Spend one SMS from the daily budget. Called only after a send actually
   * happened, and it returns false when the budget is already gone so the
   * caller can stop rather than overshoot.
   */
  async recordSmsSent(): Promise<boolean> {
    if ((await this.remainingDailyBudget()) <= 0) return false;
    await this.redis.incr('sms:daily_budget:used');
    await this.redis.expire('sms:daily_budget:used', 24 * HOUR);
    return true;
  }

  /** True when the E.164 number's country code is on the allow-list. */
  isServed(e164: string): boolean {
    const allow = this.allowlist();
    // Longest prefix first so +9 does not shadow +966.
    return [...allow].sort((a, b) => b.length - a.length).some((cc) => e164.startsWith(cc));
  }
}