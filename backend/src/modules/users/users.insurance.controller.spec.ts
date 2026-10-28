import { BadRequestException } from '@nestjs/common';
import { UsersInsuranceController } from './users.insurance.controller';
import { UsersService } from './users.service';

describe('POST /users/me/insurance', () => {
  const setup = () => {
    const users: any = { getPatientProfile: jest.fn(async () => ({ insurance: null })), setPatientInsurance: jest.fn(async () => undefined), findInsuranceCompany: jest.fn(async () => null) };
    return { users, ctrl: new UsersInsuranceController(users) };
  };

  it('answers with fixed JSON and never echoes what the patient typed', async () => {
    const { ctrl, users } = setup();
    const out = await ctrl.updateInsurance('u1', { provider: 'bupa', class: 'A', policy_number: '<script>alert(1)</script>' } as any);
    expect(out).toEqual({ success: true, verified: false });
    expect(JSON.stringify(out)).not.toContain('script');
    expect(users.setPatientInsurance).toHaveBeenCalledWith('u1', expect.objectContaining({ policy_number: '<script>alert(1)</script>', verified: false }));
  });

  it('refuses a company without a class', async () => {
    const { ctrl } = setup();
    await expect(ctrl.updateInsurance('u1', { provider: 'bupa', policy_number: 'P1' } as any)).rejects.toThrow('insurance_class_required');
    await expect(ctrl.updateInsurance('u1', { provider_name: 'Bupa', policy_number: 'P1' } as any)).rejects.toThrow('insurance_class_required');
    await expect(ctrl.updateInsurance('u1', {} as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ignores a client-supplied verified flag', async () => {
    const { ctrl, users } = setup();
    await ctrl.updateInsurance('u1', { provider: 'bupa', class: 'A', verified: true } as any);
    expect(users.setPatientInsurance.mock.calls[0][1].verified).toBe(false);
  });
});

describe('DELETE /users/me/insurance (QA I-03)', () => {
  it('removes the caller\'s policy and answers fixed JSON; asking again is harmless', async () => {
    const users: any = { clearPatientInsurance: jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false) };
    const ctrl = new UsersInsuranceController(users);
    expect(await ctrl.removeInsurance('u1')).toEqual({ success: true, removed: true });
    expect(await ctrl.removeInsurance('u1')).toEqual({ success: true, removed: false });
    expect(users.clearPatientInsurance).toHaveBeenCalledWith('u1');
  });

  const service = (profile: any) => {
    const writes: any[] = [];
    const emitted: any[] = [];
    const svc: any = Object.create(UsersService.prototype);
    svc.patientRepository = { findOne: async () => profile, updateOne: async (q: any, u: any) => { writes.push([q, u]); return {}; } };
    svc.events = { emit: (n: string, p: any) => emitted.push([n, p]) };
    return { svc, writes, emitted };
  };

  it('unsets only the insurance field of that user and releases a card picture held as media', async () => {
    const { svc, writes, emitted } = service({ insurance: { provider: 'bupa', class: 'A', card_image_url: 'media:m1', pdf_url: 'https://x/y.pdf' } });
    expect(await svc.clearPatientInsurance('u1')).toBe(true);
    expect(writes).toEqual([[{ user_id: 'u1' }, { $unset: { insurance: '' } }]]);
    expect(emitted).toEqual([['media.release', { ids: ['m1'], owner_id: 'u1' }]]);
  });

  it('with no policy it writes nothing and says so', async () => {
    for (const profile of [null, {}, { insurance: null }, { insurance: {} }]) {
      const { svc, writes, emitted } = service(profile);
      expect(await svc.clearPatientInsurance('u1')).toBe(false);
      expect(writes).toEqual([]);
      expect(emitted).toEqual([]);
    }
  });
});

describe('PATCH /users/me/profile cannot write the insurance policy (D-30)', () => {
  it('a patient\'s profile update drops `insurance`, so verified, company and class cannot be set through it', async () => {
    const written: any[] = [];
    const service: any = Object.create(UsersService.prototype);
    service.patientRepository = { findOne: async () => null, updateOne: async (_q: any, u: any) => { written.push(u.$set); return {}; } };
    await service.updatePatientProfile('u1', { notes: 'hello', insurance: { provider: 'bupa', class: 'VIP', verified: true } });
    expect(written).toEqual([{ notes: 'hello' }]);
  });

  it('the insurance setter is the one writer, and it stores exactly what the controller built', async () => {
    const written: any[] = [];
    const service: any = Object.create(UsersService.prototype);
    service.patientRepository = { updateOne: async (q: any, u: any) => { written.push([q, u.$set]); return {}; } };
    await service.setPatientInsurance('u1', { provider: 'bupa', class: 'A', verified: false });
    expect(written).toEqual([[{ user_id: 'u1' }, { insurance: { provider: 'bupa', class: 'A', verified: false } }]]);
  });
});
