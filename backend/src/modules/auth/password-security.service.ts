import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class PasswordSecurityService {
  private readonly logger = new Logger(PasswordSecurityService.name);
  private readonly HIBP_API_URL = 'https://api.pwnedpasswords.com/range/';
  private readonly BCRYPT_COST = 14;
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_SECONDS = 15 * 60;
  private readonly PROGRESSIVE_DELAY_BASE_MS = 1000;
  private readonly PROGRESSIVE_DELAY_MAX_MS = 30000;

  constructor(private readonly httpService: HttpService) {}

  async checkBreachedPassword(password: string): Promise<{ breached: boolean; count: number }> {
    try {
      const sha1Hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
      const prefix = sha1Hash.substring(0, 5);
      const suffix = sha1Hash.substring(5);

      const response = await firstValueFrom(
        this.httpService.get(`${this.HIBP_API_URL}${prefix}`, {
          timeout: 5000,
          headers: { 'User-Agent': 'NabdahPlus/1.0' },
        }),
      );

      const lines = response.data.split('\n');
      for (const line of lines) {
        const [hashSuffix, count] = line.trim().split(':');
        if (hashSuffix === suffix) {
          return { breached: true, count: parseInt(count, 10) };
        }
      }
      return { breached: false, count: 0 };
    } catch (error) {
      this.logger.warn(`HIBP API unavailable, skipping breach check: ${error.message}`);
      return { breached: false, count: 0 };
    }
  }

  async validatePasswordStrength(password: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*()_+={}\[\]:;<>,.?/~\\-]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    const breached = await this.checkBreachedPassword(password);
    if (breached.breached) {
      errors.push(`This password has been exposed in data breaches (${breached.count} times). Please choose a different password.`);
    }

    return { valid: errors.length === 0, errors };
  }

  async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.hash(password, this.BCRYPT_COST);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(password, hash);
  }

  getBcryptCost(): number {
    return this.BCRYPT_COST;
  }

  getLockoutConfig(): { maxAttempts: number; lockoutDurationSeconds: number } {
    return { maxAttempts: this.MAX_FAILED_ATTEMPTS, lockoutDurationSeconds: this.LOCKOUT_DURATION_SECONDS };
  }

  calculateProgressiveDelay(attempts: number): number {
    if (attempts <= 0) return 0;
    const delay = this.PROGRESSIVE_DELAY_BASE_MS * Math.pow(2, attempts - 1);
    return Math.min(delay, this.PROGRESSIVE_DELAY_MAX_MS);
  }

  async recordFailedAttempt(redis: any, identifier: string): Promise<{ attempts: number; locked: boolean; lockoutExpiresAt?: number }> {
    const key = `auth:failed_login:${identifier.toLowerCase()}`;
    const lockKey = `auth:lockout:${identifier.toLowerCase()}`;

    const existingLock = await redis.get(lockKey);
    if (existingLock) {
      const ttl = await redis.ttl(lockKey);
      return { attempts: this.MAX_FAILED_ATTEMPTS, locked: true, lockoutExpiresAt: Date.now() + ttl * 1000 };
    }

    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, this.LOCKOUT_DURATION_SECONDS);
    }

    if (current >= this.MAX_FAILED_ATTEMPTS) {
      await redis.set(lockKey, '1', 'EX', this.LOCKOUT_DURATION_SECONDS);
      await redis.del(key);
      return { attempts: current, locked: true, lockoutExpiresAt: Date.now() + this.LOCKOUT_DURATION_SECONDS * 1000 };
    }

    return { attempts: current, locked: false };
  }

  async clearFailedAttempts(redis: any, identifier: string): Promise<void> {
    const key = `auth:failed_login:${identifier.toLowerCase()}`;
    const lockKey = `auth:lockout:${identifier.toLowerCase()}`;
    await redis.del(key);
    await redis.del(lockKey);
  }

  async isLocked(redis: any, identifier: string): Promise<{ locked: boolean; lockoutExpiresAt?: number }> {
    const lockKey = `auth:lockout:${identifier.toLowerCase()}`;
    const locked = await redis.exists(lockKey);
    if (locked) {
      const ttl = await redis.ttl(lockKey);
      return { locked: true, lockoutExpiresAt: Date.now() + ttl * 1000 };
    }
    return { locked: false };
  }

  getGenericAuthResponse(): { success: boolean; message: string } {
    return { success: true, message: 'If the account exists, you will receive further instructions' };
  }

  getGenericLoginResponse(): { success: boolean; message: string } {
    return { success: false, message: 'Invalid credentials' };
  }
}