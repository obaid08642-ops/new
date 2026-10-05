// ACCEPTANCE — Q79 (REVIEW_REAUDIT Round 12 Phase A #2). Written by the reviewer
// before the fix; the implementing agent makes it pass and may not edit it.
//
// Required behaviour: approval needs one TYPED provider_documents row per
// required doc_type (REQUIRED_DOCS_BY_PROVIDER_TYPE), but registration sends
// only license_documents URL strings, so no provider registered from the app
// can be approved. Registration step 2 must take typed documents
// `documents: [{ doc_type, file_id }]` and record them for admin review:
// - doc_type is validated against ProviderDocumentType; unknown types refused;
// - file_id must be a storage object this account uploaded (403 otherwise,
//   400 when it does not exist), nothing is written on refusal;
// - one pending row per type (resending replaces the pending row);
// - a reviewed row (approved/rejected) is never overwritten.
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ProviderOnboardingService } from '../../src/modules/provider-onboarding/provider-onboarding.module';
import { Step2Dto } from '../../src/modules/provider-onboarding/provider-onboarding.dto';
import { ProviderProfileSchema } from '../../src/schemas/provider-profile.schema';
import { missingRequiredDocuments } from '../../src/modules/provider/required-documents';

jest.setTimeout(60_000);

type Step2 = (account: { id: string; role: string; scope: string }, body: Record<string, unknown>) => Promise<unknown>;

describe('Q79: registration records typed KYC documents', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let profiles: Model<Record<string, unknown>>;
  let step2: Step2;
  const acc = { id: 'acc-amb', role: 'provider', scope: 'provider' };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'q79' }).asPromise();
    profiles = conn.model('ProviderProfile', ProviderProfileSchema) as unknown as Model<Record<string, unknown>>;
    const svc = new ProviderOnboardingService({} as never, profiles as never, { emit: jest.fn() } as never, {} as never);
    step2 = (a, b) => (svc as unknown as { step2: Step2 }).step2(a, b);
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

  it('Step2Dto accepts typed documents and refuses an unknown doc_type', () => {
    const ok = plainToInstance(Step2Dto, { documents: [{ doc_type: 'iban_letter', file_id: 'f-iban' }] });
    expect(validateSync(ok, { whitelist: true, forbidNonWhitelisted: true })).toHaveLength(0);
    const bad = plainToInstance(Step2Dto, { documents: [{ doc_type: 'selfie', file_id: 'f' }] });
    expect(validateSync(bad, { whitelist: true, forbidNonWhitelisted: true }).length).toBeGreaterThan(0);
  });

  it('step2 records one pending row per document, which is enough for approval', async () => {
    await step2(acc, { documents: [
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
    await step2(acc, { documents: [{ doc_type: 'iban_letter', file_id: 'f-iban' }] });
    await step2(acc, { documents: [{ doc_type: 'iban_letter', file_id: 'f-cr' }] });
    const rows = await docs();
    expect(rows).toHaveLength(1);
    expect(rows[0].storage_object_id).toBe('f-cr');
  });

  it('refuses a file this account did not upload (403) or that does not exist (400), writing nothing', async () => {
    await expect(step2(acc, { documents: [{ doc_type: 'iban_letter', file_id: 'f-other-owner' }] })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(step2(acc, { documents: [{ doc_type: 'iban_letter', file_id: 'nope' }] })).rejects.toBeInstanceOf(BadRequestException);
    expect(await docs()).toHaveLength(0);
  });

  it('a reviewed (approved) document is not overwritten by a resend', async () => {
    await conn.db!.collection('provider_documents').insertOne({ id: 'd1', account_id: acc.id, doc_type: 'iban_letter', storage_object_id: 'f-iban', review_status: 'approved' });
    await step2(acc, { documents: [{ doc_type: 'iban_letter', file_id: 'f-cr' }] });
    const rows = await docs();
    expect(rows.find((r) => r.id === 'd1')!.storage_object_id).toBe('f-iban');
    expect(rows.filter((r) => r.doc_type === 'iban_letter')).toHaveLength(2);
  });
});
