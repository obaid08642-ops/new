/** Issue 434: the account exists once registered; a code that could not be sent is reported, not a failed sign-up. */
import { AuthService } from './auth.service';

describe('registration when the first code cannot be sent', () => {
  it('answers registered with otp_sent false', async () => {
    const user = { id: 'user-otp-1', full_name: 'Otp Tester', phone: '+966500000201', role: 'patient', active: true };
    const userModel: any = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(user), model: { db: { collection: () => null } } };
    const service: any = new AuthService(
      userModel, { create: jest.fn().mockResolvedValue({}) } as any, { sign: jest.fn() } as any, { emit: jest.fn() } as any,
      { checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }) } as any,
    );
    service.requestPatientOtp = jest.fn().mockRejectedValue(new Error('otp_channel_unavailable'));
    await expect(service.registerPatientContract({ name: 'Otp Tester', identifier: '+966500000201', password: 'long-enough-password', locale: 'ar', consents: [{ policy_id: 'patient_terms', version: '1.0' }] }))
      .resolves.toEqual({ registered: true, otp_sent: false });
    expect(userModel.create).toHaveBeenCalledTimes(1);
  });
});
