import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { loadOffers, ownChoices, summarize, withOffers, withOfferSummary } from './service-offers';

jest.setTimeout(120_000);
let mongod: MongoMemoryServer;
const raw = () => mongoose.connection.db!;
const col = (n: string) => raw().collection(n);
const approved = { status: 'active', public_eligibility: true, medical_review_status: 'approved' };

const LAB_TEST = { id: 'CBC', short_code: 'CBC', name_ar: 'صورة دم', category: 'hematology', home_visit_supported: true };
const LAB_TEST2 = { id: 'TSH', short_code: 'TSH', name_ar: 'غدة', category: 'hormones', home_visit_supported: false };
const SCAN = { id: 'XR_CHEST', modality: 'xray', body_part: 'chest', home_visit_supported: false };
const SCAN2 = { id: 'MAMMO', modality: 'mammography', body_part: 'breast', home_visit_supported: false };
const NURSE_SVC = { id: 'n-injection', category: 'injections' };

beforeAll(async () => { mongod = await MongoMemoryServer.create(); await mongoose.connect(mongod.getUri(), { dbName: 'service_offers_test' }); });
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });
beforeEach(async () => {
  for (const c of await raw().listCollections().toArray()) await col(c.name).deleteMany({});
  await col('provider_profiles').insertMany([
    { account_id: 'lab1', type: 'lab', name_ar: 'مختبر ١', ...approved, rating_avg: 4.5, rating_count: 10, home_visit_supported: true, test_categories: ['hematology'] },
    { account_id: 'lab2', type: 'lab', name_ar: 'مختبر ٢', ...approved, test_categories: [] },
    { account_id: 'labx', type: 'lab', name_ar: 'مختبر معلق', status: 'active', public_eligibility: false, medical_review_status: 'pending', test_categories: ['CBC'] },
    { account_id: 'rad1', type: 'radiology', name_ar: 'مركز ١', ...approved, equipment_list: ['xray'] },
    { account_id: 'rad2', type: 'radiology', name_ar: 'مركز ٢', ...approved, equipment_list: [] },
    { account_id: 'nur1', type: 'home_care', name_ar: 'ممرض', ...approved, nursing_services: [{ key: 'n-injection', price: 80, insurance: true }] },
    { account_id: 'nur2', type: 'home_care', name_ar: 'ممرض ٢', ...approved, nursing_services: [{ key: 'n-injection', price: 0, home: false, premises: true }] },
  ]);
  await col('provider_capabilities_lab').insertMany([
    { provider_account_id: 'lab1', code: 'CBC', name_ar: 'صورة دم', price: 60, available: true, home_collection_supported: true, insurance_covered: true },
    { provider_account_id: 'lab2', code: 'CBC', name_ar: 'صورة دم', price: 45, available: true, home_collection_supported: false, insurance_covered: false },
    { provider_account_id: 'lab2', code: 'TSH', name_ar: 'غدة', price: 90, available: false },
    { provider_account_id: 'labx', code: 'CBC', name_ar: 'صورة دم', price: 10, available: true },
  ]);
  await col('provider_capabilities_radiology').insertMany([
    { provider_account_id: 'rad2', scan_type: 'XRAY', body_part: 'Chest', price: 120, available: true, insurance_covered: true },
    { provider_account_id: 'rad2', service_id: 'MAMMO', scan_type: 'mammography', body_part: 'breast', price: 300, available: true, home_supported: false },
  ]);
});

describe('loadOffers', () => {
  it('lab: priced capability rows and profile listings, only approved providers, cheapest first', async () => {
    const offers = (await loadOffers(raw() as never, 'lab', [LAB_TEST, LAB_TEST2])).get('CBC')!;
    expect(offers.map((o) => [o.provider.id, o.price])).toEqual([['lab2', 45], ['lab1', 60]]);        // labx is pending: not an offer
    expect(offers.find((o) => o.provider.id === 'lab1')).toMatchObject({ home: true, insurance: true, premises: true, provider: { rating: 4.5, rating_count: 10 } });
    expect(offers.find((o) => o.provider.id === 'lab2')).toMatchObject({ home: false, insurance: false });
    expect((await loadOffers(raw() as never, 'lab', [LAB_TEST2])).get('TSH')).toEqual([]);          // the only row is not available
  });

  it('lab: a lab that lists the test category without a priced row is an offer without a price', async () => {
    await col('provider_capabilities_lab').deleteMany({ provider_account_id: 'lab1' });
    const offers = (await loadOffers(raw() as never, 'lab', [LAB_TEST])).get('CBC')!;
    expect(offers.find((o) => o.provider.id === 'lab1')).toMatchObject({ price: null, premises: true, home: true });
    expect(offers[0].provider.id).toBe('lab2');                                                       // priced first, unpriced last
  });

  it('radiology: a capability row matches by modality and body part (case-insensitive) or by service id; the equipment list counts without a price', async () => {
    const m = await loadOffers(raw() as never, 'radiology', [SCAN, SCAN2]);
    expect(m.get('XR_CHEST')!.map((o) => [o.provider.id, o.price, o.insurance])).toEqual([['rad2', 120, true], ['rad1', null, false]]);
    expect(m.get('MAMMO')!.map((o) => [o.provider.id, o.price])).toEqual([['rad2', 300]]);
  });

  it('nursing: the profile service entry; home by default, premises only when the provider says so; a zero price is no price', async () => {
    const offers = (await loadOffers(raw() as never, 'nursing', [NURSE_SVC])).get('n-injection')!;
    expect(offers.map((o) => [o.provider.id, o.price, o.home, o.premises, o.insurance])).toEqual([['nur1', 80, true, false, true], ['nur2', null, false, true, false]]);
  });

  it('a service with no provider has no offers, and an empty catalogue returns an empty map', async () => {
    expect((await loadOffers(raw() as never, 'radiology', [{ id: 'PETCT', modality: 'pet', body_part: 'whole_body' }])).get('PETCT')).toEqual([]);
    expect((await loadOffers(raw() as never, 'lab', [])).size).toBe(0);
  });
});

describe('summaries and filters', () => {
  it('summarize counts distinct providers and takes the lowest priced offer', async () => {
    const offers = (await loadOffers(raw() as never, 'lab', [LAB_TEST])).get('CBC')!;
    expect(summarize(offers)).toEqual({ providers_count: 2, from_price: 45, premises_available: true, home_available: true, insurance_accepted: true });
    expect(summarize([])).toEqual({ providers_count: 0, from_price: null, premises_available: false, home_available: false, insurance_accepted: false });
  });

  it('every catalogue row is returned with its summary, even with no provider; the filters use the offers', async () => {
    const rows = [LAB_TEST, LAB_TEST2, { id: 'NONE', short_code: 'NONE', name_ar: 'لا أحد', category: 'x' }];
    const all = await withOfferSummary(raw() as never, 'lab', rows);
    expect(all.map((r) => [r.id, r.providers_count, r.from_price])).toEqual([['CBC', 2, 45], ['TSH', 0, null], ['NONE', 0, null]]);
    expect((await withOfferSummary(raw() as never, 'lab', rows, { home_only: true })).map((r) => r.id)).toEqual(['CBC']);
    expect((await withOfferSummary(raw() as never, 'lab', rows, { insurance: true })).map((r) => r.id)).toEqual(['CBC']);
    expect((await withOfferSummary(raw() as never, 'lab', rows, { home_only: true, insurance: true })).map((r) => r.id)).toEqual(['CBC']);
  });

  it('the detail carries the full offers; a provider card never carries contact or account details', async () => {
    const one = await withOffers(raw() as never, 'lab', LAB_TEST);
    expect(one.offers).toHaveLength(2);
    expect(Object.keys(one.offers[0].provider).sort()).toEqual(['id', 'logo', 'name_ar', 'name_en', 'rating', 'rating_count']);
    expect(one.providers_count).toBe(2);
  });
});

describe('a provider\'s own choice (provider_service_offers)', () => {
  const own = (provider_account_id: string, service_id: string, extra: Record<string, unknown>) => ({ provider_account_id, vertical: 'lab', service_id, ...extra });

  it('decides over the older sources: declined hides the old row, offered uses the chosen price/place/insurance', async () => {
    await col('provider_service_offers').insertMany([
      own('lab1', 'CBC', { offered: false }),                                                            // lab1 still has an older priced row, but declined
      own('lab2', 'CBC', { offered: true, where: 'home', insurance: true, price: 30 }),                  // lab2 chose a new price and place
    ]);
    const offers = (await loadOffers(raw() as never, 'lab', [LAB_TEST])).get('CBC')!;
    expect(offers.map((o) => o.provider.id)).toEqual(['lab2']);
    expect(offers[0]).toMatchObject({ price: 30, premises: false, home: true, insurance: true });
  });

  it('ownChoices separates the providers that declined from the priced offers that chose', async () => {
    await col('provider_service_offers').insertMany([own('lab1', 'CBC', { offered: false }), own('lab2', 'CBC', { offered: true, where: 'both', price: 30 }), own('labx', 'CBC', { offered: true, price: 5 })]);
    const r = await ownChoices(raw() as never, 'lab', LAB_TEST);
    expect([...r.hidden]).toEqual(['lab1']);
    expect(r.offers.map((o) => [o.provider.id, o.price])).toEqual([['lab2', 30]]);                       // labx is not approved
  });

  it('a choice for another vertical or service does not leak', async () => {
    await col('provider_service_offers').insertOne({ provider_account_id: 'lab1', vertical: 'radiology', service_id: 'CBC', offered: false });
    expect((await loadOffers(raw() as never, 'lab', [LAB_TEST])).get('CBC')!.map((o) => o.provider.id).sort()).toEqual(['lab1', 'lab2']);
  });
});

