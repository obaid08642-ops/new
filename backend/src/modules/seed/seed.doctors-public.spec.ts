import { SeedService } from './seed.service';
import { SEED_DOCTORS as LEGACY_DEMO_DOCTORS } from '../doctors/doctors.module';

// Needs-review issues 447 and 425: seeded doctors appear in the public list and carry an English name.
describe('seeded doctors', () => {
  it('are public and reviewed, so GET /care/doctors lists them', async () => {
    const updates: any[] = [];
    const userModel: any = { findOne: jest.fn().mockResolvedValue({ id: 'u-doc' }), create: jest.fn() };
    const providerModel: any = { updateOne: jest.fn(async (_q: any, u: any) => { updates.push(u.$set); }) };
    const facilityModel: any = { findOne: jest.fn().mockResolvedValue(null) };
    const service = new SeedService(userModel, {} as any, providerModel, {} as any, {} as any, facilityModel, {} as any, {} as any);
    await service.seedDoctors();
    expect(updates.length).toBeGreaterThan(0);
    for (const u of updates) expect(u).toMatchObject({ public_eligibility: true, medical_review_status: 'approved' });
  });

  it('every legacy demo doctor has an English name', () => {
    expect(LEGACY_DEMO_DOCTORS.filter((d: any) => !d.name_en)).toEqual([]);
  });
});
