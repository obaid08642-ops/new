/** D-17: public provider reads never carry identity, banking or KYC data; they carry the SCFHS licence and `verified`. */
import { ProvidersService } from './providers.service';

const doctor = {
  id: 'doc-1', type: 'doctor', user_id: 'acct-1', scfhs_license_number: '18-RM-0012345',
  medical_review_status: 'approved', license_verified: true, name_ar: 'د. سارة', name_en: 'Dr Sara',
  national_id: '1098765432', phone: '+966511112222', email: 'dr@test.com', iban: 'SA0380000000608010167519',
  bank_account_name: 'Sara', license_documents: [{ type: 'license', url: 'docs/kyc/license.pdf' }],
  commission_cash_pct: 12, rating_avg: 4.5, consultation_modes: ['clinic'], city: 'Jeddah', address: 'Clinic 4, Tahlia St',
};
const lab = { id: 'lab-1', type: 'lab', business_name: 'Lab One', phone: '+966122222222', address: 'King Rd', lat: 21.5, lng: 39.2, national_id: '1', iban: 'SA1' };
const nurse = { id: 'n-1', type: 'nurse', name_ar: 'ن', phone: '+9665', address: 'home', lat: 1, lng: 2 };

const svcWith = (doc: any) => {
  const svc: any = Object.create(ProvidersService.prototype);
  svc.providerModel = {
    findOne: async (q: any) => (q.id === doc.id ? { toObject: () => ({ ...doc }) } : null),
    find: () => ({ sort: () => ({ limit: () => ({ lean: async () => [{ ...doc }] }) }) }),
  };
  return svc;
};
const SECRET = ['national_id', 'iban', 'bank_account_name', 'license_documents', 'commission_cash_pct', 'user_id', 'email'];

describe('D-17 public provider view', () => {
  it('a doctor: SCFHS licence + verified, no identity, banking, KYC, commission, account id, phone or email', async () => {
    const out: any = await svcWith(doctor).getPublicById('doc-1');
    expect(out).toMatchObject({ id: 'doc-1', scfhs_license_no: '18-RM-0012345', verified: true, name_en: 'Dr Sara', address: 'Clinic 4, Tahlia St' });
    for (const k of [...SECRET, 'phone']) expect(out[k]).toBeUndefined();
  });

  it('verified needs both the admin approval and a verified licence', async () => {
    expect((await svcWith({ ...doctor, license_verified: false }).getPublicById('doc-1')).verified).toBe(false);
    expect((await svcWith({ ...doctor, medical_review_status: 'pending' }).getPublicById('doc-1')).verified).toBe(false);
  });

  it('the list is cleaned the same way; a lab keeps its business contact and location', async () => {
    const [d] = await svcWith(doctor).listPublic();
    for (const k of [...SECRET, 'phone']) expect(d[k]).toBeUndefined();
    const [l] = await svcWith(lab).listPublic();
    expect(l).toMatchObject({ business_name: 'Lab One', phone: '+966122222222', address: 'King Rd', lat: 21.5, lng: 39.2 });
    expect(l.national_id).toBeUndefined();
    expect(l.iban).toBeUndefined();
  });

  it('a nurse shows no phone, home address or location (N7)', async () => {
    const out: any = await svcWith(nurse).getPublicById('n-1');
    for (const k of ['phone', 'address', 'lat', 'lng']) expect(out[k]).toBeUndefined();
  });
});
