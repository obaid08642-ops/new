import { BadRequestException } from '@nestjs/common';
import { UsersInsuranceController } from './users.insurance.controller';

describe('POST /users/me/insurance', () => {
  const setup = () => {
    const users: any = { getPatientProfile: jest.fn(async () => ({ insurance: null })), updatePatientProfile: jest.fn(async () => undefined) };
    return { users, ctrl: new UsersInsuranceController(users) };
  };

  it('answers with fixed JSON and never echoes what the patient typed', async () => {
    const { ctrl, users } = setup();
    const out = await ctrl.updateInsurance('u1', { provider: 'bupa', class: 'A', policy_number: '<script>alert(1)</script>' } as any);
    expect(out).toEqual({ success: true, verified: false });
    expect(JSON.stringify(out)).not.toContain('script');
    expect(users.updatePatientProfile).toHaveBeenCalledWith('u1', { insurance: expect.objectContaining({ policy_number: '<script>alert(1)</script>', verified: false }) });
  });

  it('refuses a company without a class', async () => {
    const { ctrl } = setup();
    await expect(ctrl.updateInsurance('u1', { provider: 'bupa', policy_number: 'P1' } as any)).rejects.toThrow('insurance_class_required');
    await expect(ctrl.updateInsurance('u1', {} as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ignores a client-supplied verified flag', async () => {
    const { ctrl, users } = setup();
    await ctrl.updateInsurance('u1', { provider: 'bupa', class: 'A', verified: true } as any);
    expect(users.updatePatientProfile.mock.calls[0][1].insurance.verified).toBe(false);
  });
});
