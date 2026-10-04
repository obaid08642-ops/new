// Q79: approval needs one typed provider_documents row per required doc_type,
// but registration only sent license_documents URL strings, so no
// app-registered provider could be approved. step2 now takes typed
// documents ({doc_type, file_id}) and records them for review. A file must
// be one this account uploaded.
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ProviderOnboardingService } from './provider-onboarding.module';
import { Step2Dto } from './provider-onboarding.dto';
import { ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { missingRequiredDocuments } from '../provider/required-documents';

jest.setTimeout(60_000);

describe('registration records typed KYC documents (Q79)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let profiles: Model<any>;
  let svc: ProviderOnboardingService;
  const acc = { id: 'acc-amb', role: 'provider', scope: 'provider' };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'q79' }).asPromise();
    profiles = conn.model('ProviderProfile', ProviderProfileSchema);
    svc = new ProviderOnboardingService({} as never, profiles as never, { emit: jest.fn() } as never, {} as never);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => {
    await profiles.deleteMany({});
    await conn.db!.collection('provider_documents').deleteMany({});
    await conn.db!.collection('storage_objects').deleteMany({});
    await profiles.create({ id: 'prof-amb', user_id: acc.id, account_id: acc.id, type: 'ambulance', provider_type: 'ambulance', name_ar: 'إسعاف' });
    await conn.db!.collection('storage_objects').insertMany([
      { id: 'f-cr', owner_account_id: acc.id }, { id: 'f-lic', owner_account_id: acc.id }, { id: 'f-iban', owner_account_id: acc.id },
      { id: 'f-other-owner', owner_account_id: 'someone-else' },
    ]);
  });

  const docs = () => conn.db!.collection('provider_documents').find({ account_id: acc.id }).toArray();

  it('the DTO keeps typed documents and refuses an unknown doc_type', () => {
    const ok = plainToInstance(Step2Dto, { documents: [{ doc_type: 'iban_letter', file_id: 'f-iban' }] });
    expect(validateSync(ok, { whitelist: true, forbidNonWhitelisted: true })).toHaveLength(0);
    const bad = plainToInstance(Step2Dto, { documents: [{ doc_type: 'selfie', file_id: 'f' }] });
    expect(validateSync(bad, { whitelist: true, forbidNonWhitelisted: true }).length).toBeGreaterThan(0);
  });

  it('step2 records one pending row per document, enough for approval', async () => {
    await svc.step2(acc, { documents: [
      { doc_type: 'commercial_registration', file_id: 'f-cr' },
      { doc_type: 'facility_license', file_id: 'f-lic' },
      { doc_type: 'iban_letter', file_id: 'f-iban' },
    ] });
    const rows = await docs();
    expect(rows.map((r) => r.doc_type).sort()).toEqual(['commercial_registration', 'facility_license', 'iban_letter']);
    expect(rows.every((r) => r.review_status === 'pending' && r.storage_object_id && r.id)).toBe(true);
    expect(missingRequiredDocuments('ambulance', rows as never)).toEqual([]);
  });

  it('re-sending a type replaces the pending row instead of adding another', async () => {
    await svc.step2(acc, { documents: [{ doc_type: 'iban_letter', file_id: 'f-iban' }] });
    await svc.step2(acc, { documents: [{ doc_type: 'iban_letter', file_id: 'f-cr' }] });
    const rows = await docs();
    expect(rows).toHaveLength(1);
    expect(rows[0].storage_object_id).toBe('f-cr');
  });

  it('refuses a file this account did not upload, or one that does not exist', async () => {
    await expect(svc.step2(acc, { documents: [{ doc_type: 'iban_letter', file_id: 'f-other-owner' }] })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.step2(acc, { documents: [{ doc_type: 'iban_letter', file_id: 'nope' }] })).rejects.toBeInstanceOf(BadRequestException);
    expect(await docs()).toHaveLength(0);
  });

  it('a reviewed (approved) document is not overwritten by a resend', async () => {
    await conn.db!.collection('provider_documents').insertOne({ id: 'd1', account_id: acc.id, doc_type: 'iban_letter', storage_object_id: 'f-iban', review_status: 'approved' });
    await svc.step2(acc, { documents: [{ doc_type: 'iban_letter', file_id: 'f-cr' }] });
    const rows = await docs();
    expect(rows.find((r) => r.id === 'd1')!.storage_object_id).toBe('f-iban');
    expect(rows.filter((r) => r.doc_type === 'iban_letter')).toHaveLength(2);
  });
});
