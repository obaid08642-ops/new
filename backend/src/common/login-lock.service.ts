/**
 * Phase 16.2 — progressive lockout of password sign-in.
 *
 * Failures are counted per identifier (an e-mail or a phone, whether or not the account exists, so a lock never tells an
 * attacker which accounts are real) in two ways:
 *   - from one IP:      5 failures lock that identifier for that IP, 1 minute, then doubling up to 15 minutes;
 *   - from anywhere:   20 failures lock the identifier for everybody, 1 minute, then doubling up to 15 minutes.
 * The IP-scoped lock stops a guesser quickly without letting a stranger lock the owner out from another network; the
 * global one stops a guesser who rotates addresses. A correct password clears both. While locked the answer is 429
 * `login_locked`, the same for any identifier.
 */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { RedisService } from '../modules/redis/redis.service';

const WINDOW_SECONDS = 30 * 60;
const IP_THRESHOLD = 5;
const GLOBAL_THRESHOLD = 20;
const FIRST_LOCK_SECONDS = 60;
const MAX_LOCK_SECONDS = 15 * 60;

/** 60, 120, 240 … capped at 15 minutes, for the n-th failure at or after the threshold (n = 0 for the threshold itself). */
export function lockSeconds(failuresPastThreshold: number): number {
  return Math.min(FIRST_LOCK_SECONDS * 2 ** Math.max(0, failuresPastThreshold), MAX_LOCK_SECONDS);
}

export function loginLockedError(retryAfterSeconds: number) {
  return new HttpException(
    { message: 'login_locked', code: 'login_locked', statusCode: HttpStatus.TOO_MANY_REQUESTS, retry_after_seconds: retryAfterSeconds },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

@Injectable()
export class LoginLockService {
  constructor(private readonly redis: RedisService) {}

  /** The same e-mail or phone typed two ways counts once; the key holds a hash, never the address. */
  private who(identifier: string): string {
    const raw = String(identifier || '').normalize('NFKC').trim().toLowerCase();
    return createHash('sha256').update(raw).digest('hex').slice(0, 32);
  }

  private keys(identifier: string, ip?: string) {
    const id = this.who(identifier);
    const where = createHash('sha256').update(String(ip || 'unknown')).digest('hex').slice(0, 16);
    return {
      ipFails: `auth:login:fails:ip:${id}:${where}`, ipLock: `auth:login:lock:ip:${id}:${where}`,
      allFails: `auth:login:fails:all:${id}`, allLock: `auth:login:lock:all:${id}`,
    };
  }

  /** Throws 429 `login_locked` while this identifier is locked for this caller. Call before checking the password. */
  async assertNotLocked(identifier: string, ip?: string): Promise<void> {
    const k = this.keys(identifier, ip);
    const left = Math.max(await this.redis.ttl(k.ipLock), await this.redis.ttl(k.allLock));
    if (left > 0) throw loginLockedError(left);
  }

  /** A wrong password (or an unknown identifier). Returns the seconds of the lock it started, 0 for none. */
  async recordFailure(identifier: string, ip?: string): Promise<number> {
    const k = this.keys(identifier, ip);
    let started = 0;
    for (const [fails, lock, threshold] of [[k.ipFails, k.ipLock, IP_THRESHOLD], [k.allFails, k.allLock, GLOBAL_THRESHOLD]] as const) {
      const n = await this.redis.incr(fails);
      if (n === 1) await this.redis.expire(fails, WINDOW_SECONDS);
      if (n >= threshold) {
        const seconds = lockSeconds(n - threshold);
        await this.redis.set(lock, String(n), seconds);
        started = Math.max(started, seconds);
      }
    }
    return started;
  }

  /** A correct password clears this caller's counters; the identifier-wide ones fall back by a full window of good behaviour. */
  async recordSuccess(identifier: string, ip?: string): Promise<void> {
    const k = this.keys(identifier, ip);
    await Promise.all([this.redis.del(k.ipFails), this.redis.del(k.ipLock), this.redis.del(k.allFails), this.redis.del(k.allLock)]);
  }
}
