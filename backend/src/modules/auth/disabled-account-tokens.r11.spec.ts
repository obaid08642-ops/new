// Second review of R11 (3ad58803): a banned or deactivated account
// (active === false) must not get a token from any path. Password and social
// login refuse it; 2FA verification and admin recovery did not.
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdminRecoveryController } from './admin-recovery.controller';

describe('disabled accounts never get a token (R11 second review)', () => {
  const disabled = { id: 'u1', email: 'a@nabd.test', role: 'admin', active: false, save: jest.fn() };

  it('verify2fa refuses before checking the code', async () => {
    const svc = Object.create(AuthService.prototype) as Record<string, unknown>;
    const verifyOtp = jest.fn();
    Object.assign(svc, { userModel: { findOne: async () => disabled }, verifyOtp, otpContact: () => 'a@nabd.test', signToken: () => 'tok' });
    await expect((svc as unknown as AuthService).verify2fa('a@nabd.test', '123456')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it('admin recovery redeem refuses a disabled admin', async () => {
    const consume = jest.fn();
    const auth = { userModel: { findOne: async () => disabled }, verifyOtp: jest.fn(), otpContact: () => 'a@nabd.test', publicUser: () => ({}), signToken: () => 'tok' };
    const ctrl = Object.create(AdminRecoveryController.prototype) as Record<string, unknown>;
    Object.assign(ctrl, { auth, recovery: { consume } });
    await expect((ctrl as unknown as AdminRecoveryController).redeem({ email: 'a@nabd.test', email_code: '123456', recovery_code: 'AAAA-BBBB-CC' } as never))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(consume).not.toHaveBeenCalled();
  });
});
