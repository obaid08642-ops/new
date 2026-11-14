/**
 * Phase 16.3 — OTP abuse limits.
 *
 * Codes go by push and email only (owner decision 2026-10-25, no SMS), so
 * there is no per-message cost to protect; the limits below stop a botnet
 * from flooding accounts' devices and inboxes and from probing numbers:
 *
 *   • at most 5 OTPs per number per hour;
 *   • at most 20 distinct numbers per IP per hour.
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
const HOUR = 60 * 60;

/** Region assumed for a number written in national form with no country. */
const DEFAULT_REGION = (process.env.OTP_DEFAULT_REGION || 'SA') as CountryCode;

export type OtpAbuseRefusal =
  | 'otp_invalid_identifier'
  | 'otp_rate_limited'
  | 'otp_ip_number_limit';

export interface OtpAbuseVerdict {
  allowed: boolean;
  code?: OtpAbuseRefusal;
}

@Injectable()
export class OtpAbuseGuard {
  private readonly logger = new Logger(OtpAbuseGuard.name);

  constructor(private readonly redis: RedisService) {}

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
   * An email identifier is never refused here; the existing
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

    const perNumber = await this.redis.checkRateLimit(
      `otp:number:${e164}`,
      MAX_OTP_PER_NUMBER_PER_HOUR,
      HOUR,
    );
    if (!perNumber.allowed) {
      return { allowed: false, code: 'otp_rate_limited' };
    }

    // Per-IP: a distinct set of numbers, so one attacker cannot fan out by
    // asking many numbers in parallel from the same address.
    if (ip) {
      const key = `otp:ip:${ip}:numbers`;
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

    return { allowed: true };
  }
}
