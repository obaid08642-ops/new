/**
 * P17-17.10: the doctor profile shows the SCFHS licence and a "verified" badge
 * after admin approval, and never carries the national ID, phone or email.
 *
 * Verified on the base as implemented (care.service.ts `toPublicDoctor`
 * allow-list + `doctorById`); this spec pins the contract, no production change.
 */
import { CareService } from './care.service';

describe('P17-17.10 doctor trust signals', () => {
  const doc = (over: Record<string, any> = {}) => ({
    id: 'd1',
    name_ar: 'د. سارة',
    name_en: 'Dr Sara',
    medical_review_status: 'approved',
    license_verified: true,
    scfhs_license_number: '18-RM-1',
    // private data that exists on the document and must never reach the public profile
    national_id: '1098765432',
    phone: '+966500000000',
    email: 'sara@example.com',
    ...over,
  });

  const service = (row: Record<string, any>) => {
    const providerModel: any = {
      findOne: async () => row,
      // doctorById finishes with the similar-doctors query; it is outside the trust-signal contract
      find: () => ({ limit: () => Promise.resolve([]) }),
      db: { collection: () => ({ find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => [] }) }) }) }) },
    };
    const facilityModel: any = { findOne: async () => null };
    const slots: any = { hasSlotsToday: async () => false, nextAvailable: async () => null };
    return new (CareService as any)(providerModel, {}, facilityModel, slots);
  };

  it('shows the verified badge and the SCFHS licence number once the admin approved the doctor', async () => {
    const out: any = await service(doc()).doctorById('d1');
    expect(out.verified).toBe(true);
    expect(out.scfhs_license_no).toBe('18-RM-1');
  });

  it('is not "verified" on approval alone when the licence was not verified', async () => {
    const out: any = await service(doc({ license_verified: false })).doctorById('d1');
    expect(out.verified).toBe(false);
    // the licence number is still shown; only the badge depends on both signals
    expect(out.scfhs_license_no).toBe('18-RM-1');
  });

  it('never exposes the national ID, the phone or the email on the public profile', async () => {
    const out: any = await service(doc()).doctorById('d1');
    const serialized = JSON.stringify(out);
    expect(serialized).not.toContain('1098765432');
    expect(serialized).not.toContain('+966500000000');
    expect(serialized).not.toContain('sara@example.com');
    for (const key of ['national_id', 'phone', 'email', 'nationalId', 'user_id', 'iban']) {
      expect(Object.keys(out)).not.toContain(key);
    }
  });
});
