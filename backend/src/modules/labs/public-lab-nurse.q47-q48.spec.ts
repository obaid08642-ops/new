// Q47/Q48 (35b44c2): the website opens lab and nurse pages without a session
// (patient-web lib/api/labs-server.ts getPublicLab, nursing-server.ts getPublicNurse),
// but both routes required a login (401). The lab route also spread the whole
// provider profile, so any signed-in patient could read the lab's IBAN, bank
// account name, tax and CR numbers, licence document links and commission rates.
import 'reflect-metadata';
import { PUBLIC_KEY } from '../../common/auth.guard';
import { PatientLabsCatalogController } from './labs-compat.controller';
import { PatientNurseProfileController } from '../home-care/nurse-profile.controller';

const profile = {
  _id: 'x', id: 'pp-lab', account_id: 'acc-lab', type: 'laboratory', status: 'active', public_eligibility: true,
  name_ar: 'مختبر', name_en: 'Lab', city: 'الرياض', district: 'العليا', address: 'شارع 1', logo: 'https://cdn/l.png',
  rating_avg: 4.2, rating_count: 3, home_visit_supported: true,
  iban: 'SA0000000000000000000000', bank_account_name: 'Synthetic', tax_number: '300000000000003', cr_number: '1010000000',
  license_documents: ['https://files/lic.pdf'], signature_url: 'https://files/sig.png', commission_cash_pct: 10,
  verification_logs: [{ by: 'admin' }], insurance_contracts: [{ company_id: 'c' }], moh_license_number: 'M1',
};
const conn = (doc: Record<string, unknown>) => ({
  db: { collection: () => ({ findOne: async () => doc, find: () => ({ limit: () => ({ toArray: async () => [] }) }) }) },
});

describe('public lab and nurse detail (Q47/Q48)', () => {
  it('both detail routes are public', () => {
    expect(Reflect.getMetadata(PUBLIC_KEY, PatientLabsCatalogController.prototype.one)).toBe(true);
    expect(Reflect.getMetadata(PUBLIC_KEY, PatientNurseProfileController.prototype.one)).toBe(true);
  });

  it('a visitor gets the lab without any private field', async () => {
    const ctrl = new PatientLabsCatalogController(conn(profile) as never);
    const { data } = await ctrl.one(undefined as never, 'acc-lab');
    expect(data).toMatchObject({ id: 'acc-lab', name_ar: 'مختبر', city: 'الرياض' });
    for (const k of ['iban', 'bank_account_name', 'tax_number', 'cr_number', 'license_documents', 'signature_url', 'commission_cash_pct', 'verification_logs', 'insurance_contracts', 'moh_license_number', '_id']) {
      expect(data).not.toHaveProperty(k);
    }
  });

  it('a visitor gets the nurse profile', async () => {
    const ctrl = new PatientNurseProfileController(conn({ ...profile, type: 'home_care', account_id: 'acc-n', id: 'pp-n' }) as never);
    const { data } = await ctrl.one(undefined as never, 'acc-n');
    expect(data).toMatchObject({ id: 'acc-n' });
  });
});
