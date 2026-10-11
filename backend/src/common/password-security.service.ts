/**
 * Phase 16.2 — passwords.
 *
 * At least 10 characters, checked against a breached-password list (k-anonymity
 * range API when reachable, a local list otherwise), progressive delays and a
 * lockout after repeated failures, and the same answer on login and on
 * "forgot password" whether or not the account exists.
 *
 * The local list holds the passwords that turn up first in every breach corpus.
 * It is deliberately conservative: it never blocks a password that is merely
 * unusual, only the ones that are known-compromised.
 */
import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

export interface PasswordCheck {
  ok: boolean;
  code?: 'password_too_short' | 'password_too_long' | 'password_compromised';
}

/** The shortest password this product accepts (plan: at least 10). */
export const MIN_PASSWORD_LENGTH = 10;
/** bcrypt never uses more than 72 bytes; refusing more is clearer than truncating. */
export const MAX_PASSWORD_LENGTH_BYTES = 72;

/** Look up the full SHA-1 suffix inside the shard for this prefix. */
export type BreachedProbe = (prefix: string, suffix: string) => Promise<boolean>;

const LOCAL_BREACHED_LIST = [
  'password', 'password1', 'password12', 'password123', 'password1234',
  'passw0rd', 'p@ssw0rd', 'p@ssword', 'qwertyuiop', 'qwerty12345',
  '1234567890', '123456789', '12345678', '1234567891',
  'iloveyou1', 'letmein123', 'welcome123', 'admin1234', 'administrator',
  'monkey1234', 'football123', 'baseball123', 'sunshine123', 'princess123',
  'trustno123', 'dragon1234', 'michael123', 'jennifer123', 'jordan123',
  '1111111111', '0000000000', 'abc1234567', 'qwertyuiop123',
];

const BREACHED_SHARD = 'https://api.pwnedpasswords.com/range';
const SHARD_CACHE_MS = 24 * 60 * 60 * 1000;
const SHARD_FETCH_TIMEOUT_MS = 3000;

@Injectable()
export class PasswordSecurityService {
  private readonly logger = new Logger(PasswordSecurityService.name);
  /** prefix -> the suffixes that shard holds, with the time they were fetched. */
  private readonly shards = new Map<string, { at: number; suffixes: Set<string> }>();

  /**
   * The shape check the API enforces: length and the breached list.
   * `probe` is injected so the range API can be tested without a network.
   */
  async check(password: string, probe: BreachedProbe = this.breachedProbe): Promise<PasswordCheck> {
    const shape = this.checkLocally(password);
    if (!shape.ok) return shape;
    try {
      if (await this.looksCompromised(password, probe)) return { ok: false, code: 'password_compromised' };
    } catch (e: any) {
      // The range API being down must not lock every user out of their account.
      this.logger.warn(`breached-password lookup failed: ${e?.message}`);
    }
    return { ok: true };
  }

  /** The part of the check that never needs the network. */
  checkLocally(password: string): PasswordCheck {
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      return { ok: false, code: 'password_too_short' };
    }
    if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_LENGTH_BYTES) {
      return { ok: false, code: 'password_too_long' };
    }
    if (LOCAL_BREACHED_LIST.includes(password.toLowerCase())) {
      return { ok: false, code: 'password_compromised' };
    }
    return { ok: true };
  }

  private async looksCompromised(password: string, probe: BreachedProbe): Promise<boolean> {
    if (LOCAL_BREACHED_LIST.includes(password.toLowerCase())) return true;
    const sha1 = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const cached = this.shards.get(prefix);
    if (cached && Date.now() - cached.at < SHARD_CACHE_MS) return cached.suffixes.has(suffix);

    const breached = await probe(prefix, suffix);
    this.shards.set(prefix, { at: Date.now(), suffixes: breached ? new Set([suffix]) : new Set() });
    return breached;
  }

  /**
   * The k-anonymity probe: only the first five characters of the SHA-1 leave the
   * server, so the password itself is never transmitted.
   */
  private breachedProbe: BreachedProbe = async (prefix, suffix) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SHARD_FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(`${BREACHED_SHARD}/${prefix}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`range api ${res.status}`);
      const body = await res.text();
      for (const line of body.split('\n')) {
        const candidate = line.split(':')[0]?.trim().toUpperCase();
        if (candidate && candidate === suffix) return true;
      }
      return false;
    } finally {
      clearTimeout(timer);
    }
  };

  /**
   * Progressive delay and lockout (16.2): the delay grows with each failure,
   * and the account is locked once the window is exhausted.
   */
  backoff(failures: number): { delay_seconds: number; locked: boolean; until?: string } {
    const threshold = Number(process.env.LOGIN_LOCK_THRESHOLD || 5);
    const windowMs = Number(process.env.LOGIN_LOCK_WINDOW_MS || 15 * 60 * 1000);
    if (failures >= threshold) {
      return { delay_seconds: 0, locked: true, until: new Date(Date.now() + windowMs).toISOString() };
    }
    const delay = Math.min(2 ** Math.max(0, failures - 1), 30);
    return { delay_seconds: delay, locked: false };
  }
}