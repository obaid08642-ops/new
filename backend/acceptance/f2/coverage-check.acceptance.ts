// ACCEPTANCE — F2 (REVIEW_REAUDIT Round 12 Phase A #6; QA_DEFECTS F2; PRODUCT.md).
// Written by the reviewer before the fix; the implementing agent makes it pass and
// may not edit it. Nabd+ does not approve claims: the provider approves in its own
// system and records approved / partial / rejected; the patient pays the copay.
// coverage-check must work with exactly what the app's add-policy screen saves
// (company_id = catalog code, provider = localized name; no network or class) and
// with what the provider saves (accepted_insurance), and benefits-summary must
// report the patient's insurance requests per service as the providers decided them.
// F2 (PRODUCT.md): Nabd+ does not approve claims; the provider approves in its
// own system and the patient pays the copay. Coverage-check used to match the
// policy against provider "insurance_contracts" that nothing real writes (and
// network/class the app never sends), so it answered covered:false for every
// real policy. It now answers whether the provider accepts the patient's
// insurance company, from what the provider saved (accepted_insurance).
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NotFoundException } from '@nestjs/common';
import { InsuranceService } from '../../src/modules/insurance/insurance.module';
import { ProviderProductionService } from '../../src/modules/provider-production/provider-production.module';
import { InsuranceCompanySchema } from '../../src/schemas/insurance.schema';
import { ProviderProfileSchema } from '../../src/schemas/provider-profile.schema';
import { FacilitySchema } from '../../src/schemas/facility.schema';
import { PatientProfileSchema } from '../../src/schemas/patient-profile.schema';

jest.setTimeout(60_000);

describe('coverage-check answers whether the provider accepts the patient\'s insurer (F2)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let service: InsuranceService;
  let patients: Model<any>;

  // The exact policy add-policy.tsx saves: company_id is the catalog code,
  // provider the localized name; no network or class.
  const appPolicy = { provider: 'بوبا العربية', company_id: 'bupa', policy_number: 'P-1', verified: false, ocr_extracted: false };
  const publicDoctor = { status: 'active', public_eligibility: true, medical_review_status: 'approved', type: 'doctor' };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'f2' }).asPromise();
    const companies = conn.model('InsuranceCompany', InsuranceCompanySchema);
    const providers = conn.model('ProviderProfile', ProviderProfileSchema);
    const facilities = conn.model('Facility', FacilitySchema);
    patients = conn.model('PatientProfile', PatientProfileSchema);
    service = new InsuranceService(companies as never, {} as never, {} as never, providers as never, facilities as never, patients as never, {} as never, {} as never, conn);
    await companies.collection.insertMany([
      { id: 'c-bupa', code: 'bupa', name_ar: 'بوبا العربية', name_en: 'Bupa Arabia', is_active: true },
      { id: 'c-taw', code: 'tawuniya', name_ar: 'التعاونية', name_en: 'Tawuniya', is_active: true },
    ]);
    await providers.collection.insertMany([
      { id: 'doc-yes', name_ar: 'د. قبول', ...publicDoctor, accepted_insurance: ['bupa'] },
      { id: 'doc-no', name_ar: 'د. رفض', ...publicDoctor, accepted_insurance: ['tawuniya'] },
      { id: 'doc-hidden', name_ar: 'د. غير معتمد', ...publicDoctor, medical_review_status: 'pending', accepted_insurance: ['bupa'] },
      { id: 'nurse-1', user_id: 'nurse-acc-1', name_ar: 'ممرضة', ...publicDoctor, type: 'nursing', accepted_insurance: ['bupa'] },
    ]);
    await facilities.collection.insertOne({ id: 'fac-1', name_ar: 'مستشفى', accepted_insurance: ['bupa'] });
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => { await patients.deleteMany({}); });

  const withPolicy = (insurance: Record<string, unknown> | null) => patients.collection.insertOne({ user_id: 'pat-1', ...(insurance ? { insurance } : {}) });

  it('a provider that accepts the patient\'s company (as saved by add-policy) is covered', async () => {
    await withPolicy(appPolicy);
    const r: any = await service.checkCoverage('pat-1', { provider_id: 'doc-yes', service_type: 'consultation' });
    expect(r).toMatchObject({ has_policy: true, covered: true, provider_id: 'doc-yes', final_decision_by: 'provider', company: { code: 'bupa', name_ar: 'بوبا العربية' } });
    expect(r.copay_percent).toBeUndefined();
  });

  it('a provider that does not accept the company is not covered, with the reason', async () => {
    await withPolicy(appPolicy);
    const r: any = await service.checkCoverage('pat-1', { provider_id: 'doc-no', service_type: 'consultation' });
    expect(r).toMatchObject({ covered: false, reason: 'provider_does_not_accept_company' });
  });

  it('a nurse is found by account id; a provider that is not public and approved is not found', async () => {
    await withPolicy({ provider: 'Bupa Arabia' });
    expect((await service.checkCoverage('pat-1', { provider_id: 'nurse-acc-1', service_type: 'home_nursing' }) as any).covered).toBe(true);
    await expect(service.checkCoverage('pat-1', { provider_id: 'doc-hidden', service_type: 'consultation' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.checkCoverage('pat-1', { provider_id: 'nobody', service_type: 'consultation' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('without a provider it counts approved public providers of that service that accept the company', async () => {
    await withPolicy(appPolicy);
    const r: any = await service.checkCoverage('pat-1', { service_type: 'consultation' });
    expect(r).toMatchObject({ covered: true, accepting_providers: 1 });
    const lab: any = await service.checkCoverage('pat-1', { service_type: 'lab' });
    expect(lab).toMatchObject({ covered: false, accepting_providers: 0, reason: 'no_provider_accepts_company' });
  });

  it('no policy, or a company outside the catalog, is never covered', async () => {
    await withPolicy(null);
    expect(await service.checkCoverage('pat-1', { service_type: 'consultation' })).toMatchObject({ has_policy: false, covered: false, reason: 'no_insurance_policy' });
    await patients.deleteMany({});
    await withPolicy({ provider: 'شركة غير موجودة', company_id: 'unknown-co' });
    expect(await service.checkCoverage('pat-1', { provider_id: 'doc-yes', service_type: 'consultation' })).toMatchObject({ has_policy: true, covered: false, reason: 'insurance_company_not_in_catalog' });
  });

  it('end to end: what the doctor saves on DoctorAvailabilityScreen is what coverage-check reads', async () => {
    await withPolicy(appPolicy);
    await conn.collection('provider_accounts').insertOne({ id: 'acc-doc-2', provider_type: 'doctor', status: 'approved', availability: {} });
    await conn.collection('provider_profiles').insertOne({ id: 'doc-2', user_id: 'acc-doc-2', name_ar: 'د. جديد', ...publicDoctor, accepted_insurance: [] });
    expect((await service.checkCoverage('pat-1', { provider_id: 'doc-2', service_type: 'consultation' }) as any).covered).toBe(false);
    const production = new ProviderProductionService(conn);
    await production.patchAvailability({ id: 'acc-doc-2', role: 'doctor' }, { accepted_insurance: [
      { company_id: 'bupa', active: true, copay_pct: 20, services: { clinic: true, online: true, home: false } },
      { company_id: 'tawuniya', active: false, services: { clinic: true, online: false, home: false } },
    ] });
    expect((await service.checkCoverage('pat-1', { provider_id: 'doc-2', service_type: 'consultation' }) as any).covered).toBe(true);
    await conn.collection('provider_profiles').deleteOne({ id: 'doc-2' });
  });
});
