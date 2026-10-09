/** Q-20: listed doctors carry verified from the admin approval (real source). */
import { CareService } from './care.service';

describe('Q-20 verified badge', () => {
  it('public listing marks approved doctors verified', async () => {
    const rows = [{ id: 'd1', city: 'Jeddah', consultation_modes: ['clinic'], medical_review_status: 'approved', license_verified: true, scfhs_license_number: '18-RM-1' }, { id: 'd2', city: 'Jeddah', consultation_modes: ['clinic'], medical_review_status: 'approved' }];
    const providerModel: any = {
      find: () => ({ sort: () => ({ limit: async () => rows }) }),
      findOne: async () => null,
      countDocuments: async () => rows.length,
    };
    const slots: any = { hasSlotsToday: async () => true, nextAvailable: async () => null };
    const svc = new (CareService as any)(providerModel, {}, {}, slots);
    const out: any = await svc.listDoctors({});
    expect(out.items[0]).toMatchObject({ verified: true, scfhs_license_no: '18-RM-1' });
    // approval alone, without a verified licence, is not "verified"
    expect(out.items[1].verified).toBe(false);
  });
});
