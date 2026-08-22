import { logger } from '../../../services/Logger';
import { ValidationError } from '../../domain/errors';

export interface PasswordPolicyConfig {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAgeDays: number;
}

export class PasswordPolicyService {
  private log = logger.scope('PasswordPolicyService');

  private config: PasswordPolicyConfig = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAgeDays: 90,
  };

  /**
   * Validates a plain text password against the centralized security policy.
   * Throws ValidationError if rules are violated.
   */
  public validate(password: string): void {
    if (password.length < this.config.minLength) {
      throw new ValidationError(`Password must be at least ${this.config.minLength} characters`);
    }

    if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
      throw new ValidationError('Password must contain at least one uppercase letter');
    }

    if (this.config.requireLowercase && !/[a-z]/.test(password)) {
      throw new ValidationError('Password must contain at least one lowercase letter');
    }

    if (this.config.requireNumbers && !/[0-9]/.test(password)) {
      throw new ValidationError('Password must contain at least one number');
    }

    if (this.config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new ValidationError('Password must contain at least one special character');
    }

    this.log.debug('Password validation passed');
  }

  /**
   * Checks if a user's password has expired based on maxAgeDays
   */
  public isPasswordExpired(lastChangedDate: Date): boolean {
    const ageMs = Date.now() - lastChangedDate.getTime();
    const maxAgeMs = this.config.maxAgeDays * 24 * 60 * 60 * 1000;
    return ageMs > maxAgeMs;
  }
}
