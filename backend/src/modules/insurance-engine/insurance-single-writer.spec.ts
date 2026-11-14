/**
 * QA P1 (web-patient): the patient's insurance object had several writers that built different shapes (save-policy kept the class in
 * `plan_class` and replaced the object; users/me/insurance kept it in `class` and merged; upload-policy replaced the object and lost the card
 * figures). They all build it with `buildPatientPolicy` now: one shape, merged over what is saved.
 */
import 'reflect-metadata';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection } from 'mongoose';
import { BadRequestException } from '@nestjs/common';
import { PatientProfileSchema } from '../../schemas/patient-profile.schema';
import { InsuranceCompanySchema } from '../../schemas/insurance.schema';
import { InsuranceFlowService } from './insurance-engine.module';
import { InsuranceService } from '../insurance/insurance.module';
import { UsersInsuranceController } from '../users/users.insurance.controller';
import { buildPatientPolicy, insuranceCompanyFilter, policyClass, policyCompanyKeys } from '../../common/insurance-policy';
import { cardCopay } from '../ordering/ordering.service';
import { applyChanges, rollbackChanges, type DbLike } from '../catalogs/catalogue-apply.core';
import { planInsuranceShape } from '../catalogs/catalogue-apply.steps';

const bupa = { id: 'co-1', code: 'bupa', name_ar: 'بوبا', name_en: 'Bupa' };
const tawuniya = { id: 'co-2', code: 'tawuniya', name_ar: 'التعاونية', name_en: 'Tawuniya' };
const NOW = new Date('2026-10-26T12:00:00Z');

describe('buildPatientPolicy (the one shape)', () => {
  it('a catalogue insurer gives company_id / code / name, a display provider, and the class in both `class` and `plan_class`', () => {
    const p = buildPatientPolicy(null, { class: 'VIP', policy_number: ' P-1 ', member_id: 'M1' }, bupa, NOW);
    expect(p).toEqual({ company_id: 'co-1', company_code: 'bupa', company_name: 'بوبا', provider: 'بوبا', class: 'VIP', plan_class: 'VIP', policy_number: 'P-1', member_id: 'M1', verified: false, saved_at: NOW });
    expect(policyClass(p)).toBe('VIP');
    expect(policyCompanyKeys(p)).toEqual(['co-1', 'bupa', 'بوبا']);
  });
  it('the class may arrive as `class` or `plan_class`; both end up set', () => {
    expect(buildPatientPolicy(null, { plan_class: 'A' }, bupa, NOW)).toMatchObject({ class: 'A', plan_class: 'A' });
  });
  it('an insurer outside the catalogue keeps the text the patient gave, without invented company fields', () => {
    const p = buildPatientPolicy(null, { provider: 'شركة محلية', class: 'B' }, null, NOW);
    expect(p).toMatchObject({ provider: 'شركة محلية', class: 'B', plan_class: 'B', verified: false });
    expect(p.company_id).toBeUndefined();
  });
  it('is merged over what is saved: a field that is not sent stays, one that is sent changes', () => {
    const before = { company_id: 'co-1', company_code: 'bupa', provider: 'بوبا', class: 'A', plan_class: 'A', pdf_url: 'u.pdf', policy_number: 'OLD', copay_percent: 20, copay_cap_sar: 500, verified: true };
    const p = buildPatientPolicy(before, { policy_number: 'NEW' }, bupa, NOW);
    expect(p).toMatchObject({ pdf_url: 'u.pdf', policy_number: 'NEW', copay_percent: 20, copay_cap_sar: 500, class: 'A', verified: false });
  });
  it('the card figures belong to one company and class: changing either without new figures drops them', () => {
    const before = { company_id: 'co-1', class: 'A', plan_class: 'A', copay_percent: 20, copay_cap_sar: 500 };
    const otherClass = buildPatientPolicy(before, { class: 'B' }, bupa, NOW);
    expect(otherClass.copay_percent).toBeUndefined();
    const otherCompany = buildPatientPolicy(before, { class: 'A' }, tawuniya, NOW);
    expect(otherCompany.copay_cap_sar).toBeUndefined();
    const withNew = buildPatientPolicy(before, { class: 'B', copay_percent: 10 }, bupa, NOW);
    expect(withNew).toMatchObject({ copay_percent: 10 });
    expect(withNew.copay_cap_sar).toBeUndefined();
  });
  it('rejects figures outside the card range and never takes `verified` from the caller', () => {
    expect(() => buildPatientPolicy(null, { copay_percent: 120 }, bupa, NOW)).toThrow(BadRequestException);
    expect(() => buildPatientPolicy(null, { copay_cap_sar: -1 }, bupa, NOW)).toThrow('invalid_copay_cap');
    expect(buildPatientPolicy(null, { verified: true } as never, bupa, NOW).verified).toBe(false);
  });
  it('the catalogue lookup finds an insurer by id, code (any case) or either name', () => {
    expect(insuranceCompanyFilter('BUPA')).toMatchObject({ is_active: true, $or: expect.arrayContaining([{ code: { $eq: 'bupa' } }, { id: { $eq: 'BUPA' } }, { name_en: { $eq: 'BUPA' } }]) });
  });
});

describe('every writer produces the same shape (in-memory MongoDB)', () => {
  jest.setTimeout(120_000);
  let mongod: MongoMemoryServer; let conn: Connection; let patients: any; let companies: any;
  let engine: InsuranceFlowService; let upload: InsuranceService; let usersCtrl: UsersInsuranceController;
  const stored = async (id: string) => ((await patients.findOne({ user_id: id }).lean()) as any).insurance;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongod.getUri()).asPromise();
    patients = conn.model('PatientProfile', PatientProfileSchema);
    companies = conn.model('InsuranceCompany', InsuranceCompanySchema);
    await companies.create([{ ...bupa, is_active: true }, { ...tawuniya, is_active: true }]);
    engine = new InsuranceFlowService(null as any, companies, patients, null as any, null as any, null as any, null as any, null as any, null as any, null as any, null as any);
    upload = new InsuranceService(companies, null as any, null as any, null as any, null as any, patients, null as any, null as any, null as any);
    // the users controller over the same collections (the real UsersService only adds its repository plumbing)
    const users: any = {
      getPatientProfile: async (id: string) => (await patients.findOne({ user_id: id }).lean()) ?? {},
      findInsuranceCompany: async (key: string) => companies.findOne(insuranceCompanyFilter(key)).lean(),
      setPatientInsurance: async (id: string, insurance: any) => patients.updateOne({ user_id: id }, { $set: { insurance } }, { upsert: true }),
    };
    usersCtrl = new UsersInsuranceController(users);
  });
  afterAll(async () => { await conn?.close(); await mongod?.stop(); });

  it('the three endpoints store the same keys for the same card', async () => {
    await engine.savePolicy({ id: 'a' }, { company_id: 'bupa', plan_class: 'VIP', policy_number: 'P-1', member_id: 'M1' });
    await usersCtrl.updateInsurance('b', { provider: 'bupa', class: 'VIP', policy_number: 'P-1', member_id: 'M1' } as any);
    await upload.uploadPolicy({ provider: 'bupa', class: 'VIP', policy_number: 'P-1', member_id: 'M1' } as any, 'c');
    const [a, b, c] = [await stored('a'), await stored('b'), await stored('c')];
    const strip = (x: any) => { const { saved_at, ...rest } = x; return rest; };
    expect(strip(b)).toEqual(strip(a));
    expect(strip(c)).toEqual(strip(a));
    for (const x of [a, b, c]) {
      expect(x).toMatchObject({ company_id: 'co-1', company_code: 'bupa', class: 'VIP', plan_class: 'VIP', verified: false });
      expect(policyClass(x)).toBe('VIP');
    }
  });

  it('the card figures survive a later save from any other endpoint (company → class → copay)', async () => {
    await engine.savePolicy({ id: 'd' }, { company_id: 'bupa', plan_class: 'A', policy_number: 'P-9', copay_percent: 20, copay_cap_sar: 500 });
    await upload.uploadPolicy({ provider: 'bupa', class: 'A', policy_number: 'P-9', pdf_url: 'card.pdf' } as any, 'd');
    await usersCtrl.updateInsurance('d', { provider: 'bupa', class: 'A', network: 'gold' } as any);
    const x = await stored('d');
    expect(x).toMatchObject({ copay_percent: 20, copay_cap_sar: 500, pdf_url: 'card.pdf', network: 'gold', policy_number: 'P-9' });
    expect(cardCopay(x)).toEqual({ percent: 20, cap: 500 });
    // a different class is a different card: the old figures go
    await usersCtrl.updateInsurance('d', { provider: 'bupa', class: 'B' } as any);
    expect(cardCopay(await stored('d'))).toBeNull();
  });

  it('verified is never set by any of them', async () => {
    await usersCtrl.updateInsurance('e', { provider: 'bupa', class: 'A', verified: true } as any);
    await upload.uploadPolicy({ provider: 'bupa', class: 'A', policy_number: 'P-3', verified: true } as any, 'e');
    expect((await stored('e')).verified).toBe(false);
  });

  it('the guarded step gives old policies both class names, overwrites nothing, and a second plan is empty', async () => {
    const raw = conn.db as unknown as DbLike;
    await patients.collection.deleteMany({});
    await patients.collection.insertMany([
      { user_id: 'old-engine', insurance: { company_id: 'co-1', plan_class: 'VIP' } },
      { user_id: 'old-users', insurance: { provider: 'bupa', class: 'A' } },
      { user_id: 'both', insurance: { company_id: 'co-1', class: 'A', plan_class: 'B' } },
      { user_id: 'none', insurance: { company_id: 'co-1' } },
      { user_id: 'no-insurance' },
    ]);
    const { changes, report } = await planInsuranceShape(raw);
    expect(report).toEqual({ policies_checked: 4, class_added: 1, plan_class_added: 1 });
    await applyChanges(raw, changes);
    expect((await stored('old-engine'))).toMatchObject({ class: 'VIP', plan_class: 'VIP' });
    expect((await stored('old-users'))).toMatchObject({ class: 'A', plan_class: 'A' });
    expect((await stored('both'))).toMatchObject({ class: 'A', plan_class: 'B' }); // left alone
    expect((await planInsuranceShape(raw)).changes).toHaveLength(0);
    await rollbackChanges(raw, changes);
    expect((await stored('old-engine')).class).toBeUndefined();
  });
});
