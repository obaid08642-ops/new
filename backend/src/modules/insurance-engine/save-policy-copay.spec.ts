/**
 * QA P1: the figures printed on the card (copay_percent, copay_cap_sar) are stored when the policy is saved and read back by
 * the pre-booking estimate. Before: the PatientProfile insurance sub-schema had no such fields, so Mongoose strict mode dropped
 * them silently while the response still echoed them. Real Mongoose on an in-memory MongoDB, the real service writer.
 */
import 'reflect-metadata';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection } from 'mongoose';
import { PatientProfileSchema } from '../../schemas/patient-profile.schema';
import { InsuranceCompanySchema } from '../../schemas/insurance.schema';
import { InsuranceFlowService } from './insurance-engine.module';
import { InsuranceController } from '../insurance/insurance.module';
import { InsuranceFlowController } from './insurance-engine.module';
import { cardCopay } from '../ordering/ordering.service';

jest.setTimeout(120_000);

describe('save-policy keeps the card figures', () => {
  let mongod: MongoMemoryServer;
  let conn: Connection;
  let service: InsuranceFlowService;
  let patients: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongod.getUri()).asPromise();
    patients = conn.model('PatientProfile', PatientProfileSchema);
    const companies = conn.model('InsuranceCompany', InsuranceCompanySchema);
    await companies.create({ id: 'co-1', code: 'bupa', name_ar: 'بوبا', name_en: 'Bupa', is_active: true });
    service = new InsuranceFlowService(null as any, companies as any, patients, null as any, null as any, null as any, null as any, null as any, null as any, null as any, null as any);
  });
  afterAll(async () => { await conn?.close(); await mongod?.stop(); });

  it('stores copay_percent and copay_cap_sar on the patient profile and reads them back for the estimate', async () => {
    const res: any = await service.savePolicy({ id: 'u1' }, { company_id: 'bupa', policy_number: 'P-1', copay_percent: 20, copay_cap_sar: 500 });
    expect(res.policy).toMatchObject({ copay_percent: 20, copay_cap_sar: 500, verified: false });
    const stored: any = await patients.findOne({ user_id: 'u1' }).lean();
    expect(stored.insurance).toMatchObject({ company_code: 'bupa', policy_number: 'P-1', copay_percent: 20, copay_cap_sar: 500 });
    expect(cardCopay(stored.insurance)).toEqual({ percent: 20, cap: 500 });
    const read: any = await service.myPolicy({ id: 'u1' });
    expect(read.policy).toMatchObject({ copay_percent: 20, copay_cap_sar: 500 });
  });

  it('a save without the figures stores none (no guessing) and the estimate has no card copay', async () => {
    await service.savePolicy({ id: 'u2' }, { company_id: 'bupa', policy_number: 'P-2' });
    const stored: any = await patients.findOne({ user_id: 'u2' }).lean();
    expect(stored.insurance.copay_percent).toBeUndefined();
    expect(cardCopay(stored.insurance)).toBeNull();
  });

  it('POST /insurance/save-policy has exactly one writer', () => {
    const routes = (ctrl: any) => Object.getOwnPropertyNames(ctrl.prototype).filter((n) => Reflect.getMetadata('path', ctrl.prototype[n]) === 'save-policy');
    expect(routes(InsuranceFlowController)).toEqual(['savePolicy']);
    expect(routes(InsuranceController)).toEqual([]);
  });
});
