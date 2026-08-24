import { PasswordPolicyService } from '../../../src/core/platform/auth/PasswordPolicyService';
import { ValidationError } from '../../../src/core/domain/errors';

describe('PasswordPolicyService', () => {
  let policy: PasswordPolicyService;

  beforeEach(() => {
    policy = new PasswordPolicyService();
  });

  it('should pass strong passwords', () => {
    expect(() => policy.validate('StrongPass1!')).not.toThrow();
  });

  it('should fail short passwords', () => {
    expect(() => policy.validate('Sh1!')).toThrow(ValidationError);
  });

  it('should fail missing number', () => {
    expect(() => policy.validate('StrongPass!')).toThrow(ValidationError);
  });

  it('should fail missing special char', () => {
    expect(() => policy.validate('StrongPass12')).toThrow(ValidationError);
  });
});
