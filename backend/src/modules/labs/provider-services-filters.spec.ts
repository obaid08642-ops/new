import { LabsService } from './labs.service';
import { HomeCareCompatController } from '../home-care/home-care-compat.module';
import { loadOffers } from '../../common/service-offers';

/**
 * QA provider-services gaps 4, 5, 8, 9 (2026-10-28/29): `GET /labs/compatible-providers?location=home` and `&insurance=1` returned every lab, `GET /home-care/providers?insurance=1`
 * returned every nurse, and the nurse row carried no insurance flag. The home/insurance choices a lab makes at registration (test_home_map / test_insurance_map) were not read.
 */
function fakeDb(rows: Record<string, any[]>) {
  return { collection: (name: string) => ({ find: () => ({ toArray: async () => rows[name] ?? [] }) }) };
}
const approved = { status: 'active', public_eligibility: true, medical_review_status: 'approved' };
const LAB_A = { account_id: 'labA', id: 'fA', type: 'lab', name_ar: 'أ', ...approved, home_visit_supported: true, test_categories: ['CBC', 'TSH'], test_home_map: { CBC: true, TSH: 'true' }, test_insurance_map: { CBC: true, TSH: true } };
const LAB_B = { account_id: 'labB', id: 'fB', type: 'lab', name_ar: 'ب', ...approved, home_visit_supported: false, test_categories: ['CBC', 'TSH'], test_home_map: { CBC: false, TSH: false }, test_insurance_map: { CBC: false, TSH: true } };
const SERVICES = [{ id: 'CBC', short_code: 'CBC', category: 'hematology', price: 110, home_visit_supported: true }, { id: 'TSH', short_code: 'TSH', category: 'hormones', price: 90, home_visit_supported: true }];

function labsService() {
  const db = fakeDb({ provider_profiles: [LAB_A, LAB_B] });
  const service: any = Object.create(LabsService.prototype);
  service.svcModel = { find: jest.fn().mockResolvedValue(SERVICES), db: { collection: (n: string) => (n === 'provider_capabilities_lab' ? { find: () => ({ toArray: async () => [] }) } : db.collection(n)) } };
  service.providerProfiles = { find: jest.fn().mockReturnValue({ limit: () => ({ lean: async () => [LAB_A, LAB_B] }) }) };
  return service;
}

describe('labs compatible-providers: home and insurance filters', () => {
  it('no filter: both labs (unchanged)', async () => {
    expect((await labsService().compatibleProviders(['CBC', 'TSH'])).map((l: any) => l.id)).toEqual(['labA', 'labB']);
  });
  it('location=home keeps only the lab that collects at home for every requested test', async () => {
    expect((await labsService().compatibleProviders(['CBC', 'TSH'], { home: true })).map((l: any) => l.id)).toEqual(['labA']);
  });
  it('insurance=1 needs every requested test covered: lab B covers TSH only, so it is out for both tests and in for TSH alone', async () => {
    expect((await labsService().compatibleProviders(['CBC', 'TSH'], { insurance: true })).map((l: any) => l.id)).toEqual(['labA']);
    const svc = labsService();
    svc.svcModel.find = jest.fn().mockResolvedValue([SERVICES[1]]);
    expect((await svc.compatibleProviders(['TSH'], { insurance: true })).map((l: any) => l.id)).toEqual(['labA', 'labB']);
  });
  it('both filters together', async () => {
    expect((await labsService().compatibleProviders(['CBC', 'TSH'], { home: true, insurance: true })).map((l: any) => l.id)).toEqual(['labA']);
  });
});

describe('offers read the registration maps', () => {
  it('lab home and insurance per test come from test_home_map / test_insurance_map (booleans or "true")', async () => {
    const offers = await loadOffers(fakeDb({ provider_profiles: [LAB_A, LAB_B] }) as never, 'lab', SERVICES);
    expect(offers.get('CBC')!.map((o) => [o.provider.id, o.home, o.insurance]).sort()).toEqual([['labA', true, true], ['labB', false, false]]);
    expect(offers.get('TSH')!.map((o) => [o.provider.id, o.home, o.insurance]).sort()).toEqual([['labA', true, true], ['labB', false, true]]);
  });
});

describe('nurse list: insurance filter and flag', () => {
  const NURSES = [
    { account_id: 'n1', id: 'p1', type: 'home_care', name_ar: 'ممرض ١', ...approved, nursing_services: [{ key: 's1', price: 150, insurance: true }] },
    { account_id: 'n2', id: 'p2', type: 'home_care', name_ar: 'ممرض ٢', ...approved, nursing_services: [{ key: 's1', price: 120, insurance: false }] },
  ];
  function controller() {
    const db = fakeDb({ provider_profiles: NURSES });
    const services: any = { findOne: () => ({ lean: async () => ({ id: 's1', price: 100 }) }), db };
    const profiles: any = { find: () => ({ limit: () => ({ lean: async () => NURSES }) }) };
    return new (HomeCareCompatController as any)({}, services, profiles, {}) as HomeCareCompatController & Record<string, any>;
  }
  it('every nurse row says whether it accepts insurance for the service', async () => {
    const out = await controller().providers({ type: 's1' });
    expect(out.map((n: any) => [n.id, n.insurance])).toEqual([['n1', true], ['n2', false]]);
  });
  it('insurance=1 keeps only nurses that accept insurance for the service', async () => {
    const out = await controller().providers({ type: 's1', insurance: '1' });
    expect(out.map((n: any) => n.id)).toEqual(['n1']);
  });
});
