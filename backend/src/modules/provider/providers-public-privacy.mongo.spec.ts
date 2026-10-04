// F2 independent check: GET /providers (network providers screens) and GET
// /providers/:id are @Public and returned whole provider profiles, including
// IBAN, national id, tax number, signature, commission terms and license
// documents. Public reads use PROVIDER_PUBLIC_PROJECTION.
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ProvidersService } from './providers.service';
import { ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { PROVIDER_PRIVATE_FIELDS } from '../provider-onboarding/provider-private-fields';

jest.setTimeout(60_000);

describe('public provider reads never expose private fields', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let providers: Model<any>;
  let service: ProvidersService;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'privacy' }).asPromise();
    providers = conn.model('ProviderProfile', ProviderProfileSchema);
    service = new ProvidersService({} as never, providers as never, {} as never, {} as never, {} as never);
    await providers.collection.insertOne({
      id: 'p1', name_ar: 'د', type: 'doctor', status: 'active', public_eligibility: true, medical_review_status: 'approved', accepted_insurance: ['bupa'],
      iban: 'SA0380000000608010167519', bank_account_name: 'Synthetic Acct', national_id: '1000000001', tax_number: '300000000000003',
      signature_url: 'https://r2/sig.png', commission_rate: 10, commission_cash_pct: 12, commission_insurance_pct: 8, license_documents: ['doc'],
    });
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  const assertClean = (row: any) => {
    expect(row.id).toBe('p1');
    for (const f of [...PROVIDER_PRIVATE_FIELDS, 'license_documents']) expect(row).not.toHaveProperty(f);
  };

  it('GET /providers (insurer filter) drops them', async () => {
    const rows: any[] = await service.listPublic(undefined as never, undefined as never, 'bupa');
    assertClean(rows[0]);
  });

  it('GET /providers/:id drops them', async () => {
    const p: any = await service.getPublicById('p1');
    assertClean(p?.toObject ? p.toObject() : p);
  });
});
