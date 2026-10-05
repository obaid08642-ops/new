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
      id: 'p1', name_ar: 'د', type: 'doctor', insurance_plans: { bupa: ['gold'] }, status: 'active', public_eligibility: true, medical_review_status: 'approved', accepted_insurance: ['bupa'],
      iban: 'SA0380000000608010167519', bank_account_name: 'Synthetic Acct', national_id: '1000000001', tax_number: '300000000000003',
      signature_url: 'https://r2/sig.png', commission_rate: 10, commission_cash_pct: 12, commission_insurance_pct: 8, license_documents: ['doc'],
      // Second check: everything else private that lives on provider_profiles.
      registration_steps: { step2: [{ at: new Date(), data: { iban: 'SA0380000000608010167519', cr_number: '1010000000' } }] },
      verification_logs: [{ note: 'admin note' }], doctors_roster: [{ email: 'doc@clinic.test' }], pharmacy_roster: [{ name: 'x' }],
      ambulance_roster: [{ name: 'y' }], cr_number: '1010000000', moh_license_number: 'MOH-1', sfda_license_number: 'SFDA-1',
      license_number: 'L-1', scfhs_license_number: 'S-1', legal_name: 'Synthetic Co', rejected_reason: 'r', approved_by: 'adm-1',
      vehicle_plates: ['ABC 123'], insurance_contracts: [{ company_id: 'x' }], signer_name: 'S', pharmacist_name: 'P', password_hash: 'h',
    });
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  const assertClean = (row: any) => {
    expect(row.id).toBe('p1');
    for (const f of [...PROVIDER_PRIVATE_FIELDS, 'license_documents', 'registration_steps', 'verification_logs', 'doctors_roster',
      'pharmacy_roster', 'ambulance_roster', 'cr_number', 'moh_license_number', 'sfda_license_number', 'license_number', 'scfhs_license_number',
      'legal_name', 'rejected_reason', 'approved_by', 'vehicle_plates', 'insurance_contracts', 'signer_name', 'pharmacist_name', 'password_hash']) {
      expect(row).not.toHaveProperty(f);
    }
    expect(JSON.stringify(row)).not.toContain('SA0380000000608010167519');
    // The public card still has what the screens show.
    // The public card still has what the screens show (consultations tab reads insurance_plans).
    expect(row).toMatchObject({ name_ar: 'د', type: 'doctor', accepted_insurance: ['bupa'], insurance_plans: { bupa: ['gold'] } });
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
