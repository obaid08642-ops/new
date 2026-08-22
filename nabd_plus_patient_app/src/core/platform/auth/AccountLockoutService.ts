import { logger } from '../../../services/Logger';

export interface LockoutRecord {
  failedAttempts: number;
  lockedUntil: Date | null;
}

export class AccountLockoutService {
  private log = logger.scope('AccountLockoutService');
  private attemptsTracker = new Map<string, LockoutRecord>();

  private MAX_FAILED_ATTEMPTS = 5;
  private LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Check if the account is currently locked out
   */
  public isLocked(identifier: string): boolean {
    const record = this.attemptsTracker.get(identifier);
    if (!record || !record.lockedUntil) return false;

    if (Date.now() < record.lockedUntil.getTime()) {
      return true; // Still locked
    } else {
      // Lockout expired naturally
      this.resetAttempts(identifier);
      return false;
    }
  }

  /**
   * Record a failed login attempt. Automatically locks if max attempts reached.
   */
  public recordFailedAttempt(identifier: string): void {
    const record = this.attemptsTracker.get(identifier) || { failedAttempts: 0, lockedUntil: null };
    record.failedAttempts += 1;

    if (record.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      record.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MS);
      this.log.warn(`Account ${identifier} is now locked until ${record.lockedUntil}`);
    } else {
      this.log.debug(`Failed attempt recorded for ${identifier}. Total: ${record.failedAttempts}`);
    }

    this.attemptsTracker.set(identifier, record);
  }

  /**
   * Reset attempts on successful login
   */
  public resetAttempts(identifier: string): void {
    if (this.attemptsTracker.has(identifier)) {
      this.log.debug(`Resetting failed attempts for ${identifier}`);
      this.attemptsTracker.delete(identifier);
    }
  }
}
