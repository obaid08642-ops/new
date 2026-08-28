import { AccountLockoutService } from '../../../src/core/platform/auth/AccountLockoutService';

describe('AccountLockoutService', () => {
  let lockoutService: AccountLockoutService;

  beforeEach(() => {
    lockoutService = new AccountLockoutService();
  });

  it('should not be locked initially', () => {
    expect(lockoutService.isLocked('user1')).toBe(false);
  });

  it('should lock after 5 failed attempts', () => {
    for (let i = 0; i < 5; i++) {
      lockoutService.recordFailedAttempt('user1');
    }
    expect(lockoutService.isLocked('user1')).toBe(true);
  });

  it('should not lock other users', () => {
    for (let i = 0; i < 5; i++) {
      lockoutService.recordFailedAttempt('user1');
    }
    expect(lockoutService.isLocked('user2')).toBe(false);
  });

  it('should reset attempts on successful login', () => {
    lockoutService.recordFailedAttempt('user1');
    lockoutService.resetAttempts('user1');
    for (let i = 0; i < 4; i++) {
      lockoutService.recordFailedAttempt('user1');
    }
    expect(lockoutService.isLocked('user1')).toBe(false); // 4 attempts since reset
  });
});
