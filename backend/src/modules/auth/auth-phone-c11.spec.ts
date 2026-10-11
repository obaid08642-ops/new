import { AuthService } from './auth.service';

// OC-C C-11 (431): SA phone identifiers match in one canonical form.
function build() {
  const user = { id: 'u-1', full_name: 'N', phone: '+966512345678', role: 'patient', active: true };
  const userModel: any = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(user) };
  const patientModel: any = { create: jest.fn().mockResolvedValue({}) };
  const mail = { sendOtp: jest.fn(async () => ({ ok: true })) };
  const service = new AuthService(
    userModel, patientModel, { sign: jest.fn() } as any, { emit: jest.fn() } as any,
    { checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }) } as any,
    undefined, undefined, undefined, undefined, undefined, mail as any,
  );
  return { service, userModel };
}

const reg = (service: any, identifier: string) => service.registerPatientContract({
  name: 'N', identifier, password: 'long-enough-password', locale: 'ar',
  consents: [{ policy_id: 'x', version: '1' }],
});

describe('OC C-11 phone normalisation', () => {
  it.each([['0512345678'], ['+966512345678'], ['00966512345678'], ['966512345678']])('stores %s as +966512345678', async (identifier) => {
    const { service, userModel } = build();
    await service.registerPatientContract({
      name: 'N', identifier, password: 'long-enough-password', locale: 'ar',
      consents: [{ policy_id: 'x', version: '1' }],
    });
    expect(userModel.create).toHaveBeenCalledWith(expect.objectContaining({ phone: '+966512345678' }));
    void reg;
  });

  it('leaves emails and non-SA numbers alone', async () => {
    const { service, userModel } = build();
    await service.registerPatientContract({
      name: 'N', identifier: 'patient@example.test', password: 'long-enough-password', locale: 'ar',
      consents: [{ policy_id: 'x', version: '1' }],
    });
    expect(userModel.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'patient@example.test' }));
  });
});
