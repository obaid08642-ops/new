/** D-17: public provider endpoints never leak PII, include scfhs_license_no + verified. */
import { ProvidersService } from './providers.service';

const baseDoc = {
  id: 'doc-1',
  type: 'doctor',
  scfhs_license_number: '18-RM-0012345',
  status: 'active',
  public_eligibility: true,
  medical_review_status: 'approved',
  license_verified: true,
  name_ar: 'د. سارة',
  name_en: 'Dr Sara',
  national_id: '1098765432',
  phone: '+966511112222',
  email: 'dr@test.com',
  iban: 'SA0380000000608010167519',
  license_documents: [{ type: 'license', url: 'docs/kyc/license.pdf' }],
  rating: 4.5,
  rating_avg: 4.5,
  rating_count: 10,
  consultation_modes: ['clinic'],
  city: 'Jeddah',
  district: 'Al Salam',
};

const createMockProviderModel = (doc: any) => ({
  findOne: async (q: any, proj?: any) => (q.id === doc.id ? doc : null),
  find: () => ({
    sort: (sortObj: any) => ({
      limit: (limit: number) => ({
        lean: async () => [doc],
      }),
    }),
  }),
});

const svcWith = (doc: any = baseDoc) => {
  const userModel: any = { findOne: async () => null };
  const providerModel: any = createMockProviderModel(doc);
  const events: any = { emit: () => {} };
  const publication: any = { refresh: async () => {} };
  return new (ProvidersService as any)(userModel, providerModel, {}, events, {}, publication, undefined);
};

describe('D-17 public provider view', () => {
  it('getPublicById returns scfhs_license_no + verified, no PII', async () => {
    const out: any = await svcWith().getPublicById('doc-1');
    expect(out.scfhs_license_no).toBe('18-RM-0012345');
    expect(out.verified).toBe(true);
    expect(out.national_id).toBeUndefined();
    expect(out.phone).toBeUndefined();
    expect(out.email).toBeUndefined();
    expect(out.iban).toBeUndefined();
    expect(out.license_documents).toBeUndefined();
  });

  it('unverified doctor has verified=false', async () => {
    const out: any = await svcWith({ ...baseDoc, license_verified: false }).getPublicById('doc-1');
    expect(out.verified).toBe(false);
  });

  it('listPublic uses toPublicProvider (no PII)', async () => {
    const out: any = await svcWith().listPublic();
    expect(out[0].scfhs_license_no).toBe('18-RM-0012345');
    expect(out[0].national_id).toBeUndefined();
  });
});
