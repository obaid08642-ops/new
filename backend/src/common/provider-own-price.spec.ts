/**
 * P1 (QA, 2026-10-29): a provider's own price must be the price the patient sees (list, detail, comparison, quote) and pays. Lab A registered 95 and lab B 130 for a test the
 * catalogue prices at 110: the patient saw and paid 110 at both. Same for centres (210 / 190 against 250) and nurses (150 / 120 against 100). The order of the sources:
 * the provider's own per-service choice (provider_service_offers), else its capability row, else the price it typed at registration, else the catalogue price.
 * Real MongoDB (in memory) and the real services; only the booking collections and the event plumbing are stand-ins.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { LabsService } from '../modules/labs/labs.service';
import { RadiologyOpsService } from '../modules/radiology/radiology.service';
import { HomeCareSvc } from '../modules/home-care/home-care.service';
import { HomeCareCompatController } from '../modules/home-care/home-care-compat.module';
import { LabService, LabServiceSchema } from '../schemas/lab.schema';
import { RadiologyService as RadiologyServiceDoc, RadiologyServiceSchema } from '../schemas/radiology.schema';
import { HomeCareService, HomeCareServiceSchema } from '../schemas/home-care.schema';
import { ProviderProfile, ProviderProfileSchema } from '../schemas/provider-profile.schema';
import { registeredPrice, ownPrices } from './service-offers';

jest.setTimeout(120_000);
let mongo: MongoMemoryServer;
const col = (n: string) => mongoose.connection.collection(n);
const approved = { status: 'active', public_eligibility: true, medical_review_status: 'approved', is_deleted: false };
const patient = { id: 'p1', role: 'patient', full_name: 'Patient', phone: '0500000000' };
const when = () => new Date(Date.now() + 86_400_000).toISOString();
const bookingModel = () => {
  const created: any[] = [];
  const model: any = {
    countDocuments: async () => 0,
    find: () => ({ lean: async () => [] }),
    findOne: () => ({ lean: async () => null }),
    updateOne: async () => ({}),
    create: async (d: any) => { created.push(d); return { ...d, id: 'b1', tracking_id: 'trk', state_history: [], save: async () => undefined, toObject() { return { ...d, id: 'b1' }; } }; },
  };
  return { model, created };
};

let LabModel: mongoose.Model<any>; let RadModel: mongoose.Model<any>; let NurseSvcModel: mongoose.Model<any>; let ProfileModel: mongoose.Model<any>;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'own_price' });
  LabModel = mongoose.model(LabService.name, LabServiceSchema);
  RadModel = mongoose.model(RadiologyServiceDoc.name, RadiologyServiceSchema);
  NurseSvcModel = mongoose.model(HomeCareService.name, HomeCareServiceSchema);
  ProfileModel = mongoose.model(ProviderProfile.name, ProviderProfileSchema);
});
afterAll(async () => { await mongoose.disconnect(); await mongo.stop(); });
beforeEach(async () => { for (const c of await mongoose.connection.db!.listCollections().toArray()) await col(c.name).deleteMany({}); });

describe('the reader of a registration price', () => {
  it('reads the numbers and the strings the apps send, and nothing else', () => {
    expect(registeredPrice({ a: '95', b: 130, c: ' 1,5 ', d: 'x', e: 0, f: -4 }, 'a')).toBe(95);
    expect(registeredPrice({ a: '95', b: 130 }, 'zz', 'b')).toBe(130);
    expect(registeredPrice({ c: ' 1,5 ' }, 'c')).toBe(1.5);
    for (const k of ['d', 'e', 'f', 'missing']) expect(registeredPrice({ d: 'x', e: 0, f: -4 }, k)).toBeNull();
    expect(registeredPrice(undefined, 'a')).toBeNull();
  });
});

describe('labs: lab A registered 95, lab B 130; the catalogue says 110', () => {
  const seed = async () => {
    await col('lab_services').insertOne({ id: 'test-1', name_ar: 'تحليل', name_en: 'Test', short_code: 'T1', category: 'blood', price: 110, active: true, is_deleted: false, public_eligibility: true, medical_review_status: 'approved', home_visit_supported: true, facility_visit_supported: true });
    await col('provider_profiles').insertMany([
      { id: 'prof-a', account_id: 'lab-a', type: 'lab', name_ar: 'مختبر أ', name_en: 'Lab A', test_categories: ['test-1'], test_prices: { 'test-1': '95' }, test_home_map: { 'test-1': true }, test_insurance_map: { 'test-1': true }, ...approved },
      { id: 'prof-b', account_id: 'lab-b', type: 'lab', name_ar: 'مختبر ب', name_en: 'Lab B', test_categories: ['test-1'], test_prices: { 'test-1': '130' }, test_home_map: { 'test-1': false }, test_insurance_map: { 'test-1': false }, ...approved },
    ] as never);
  };
  const make = () => {
    const { model, created } = bookingModel();
    const svc = new (LabsService as any)(LabModel, model, {}, ProfileModel, { emit: jest.fn() }, { emit: async () => undefined }, { announceCreated: async () => undefined }, {});
    return { svc, created };
  };

  it('the list of labs for the test shows each lab its own price', async () => {
    await seed();
    const rows = await make().svc.compatibleProviders(['test-1']);
    expect(Object.fromEntries(rows.map((r: any) => [r.id, r.price]))).toEqual({ 'lab-a': 95, 'lab-b': 130 });
  });

  it('the comparison is not empty: both labs, their own prices, and home / insurance for THIS test', async () => {
    await seed();
    const out = await make().svc.priceComparison('test-1');
    expect(out.catalog_price).toBe(110);
    expect(out.offers.map((o: any) => [o.provider.id, o.price, o.home_collection_supported, o.insurance_covered])).toEqual([['lab-a', 95, true, true], ['lab-b', 130, false, false]]);
  });

  it("the lab's own page lists the test at its price", async () => {
    await seed();
    const page = await make().svc.publicLab('lab-a');
    expect(page.data.services).toEqual([expect.objectContaining({ id: 'test-1', price: 95 })]);
  });

  it('the patient pays what the lab set: 95 at lab A, 130 at lab B', async () => {
    await seed();
    const { svc, created } = make();
    await svc.book(patient, { items: [{ service_id: 'test-1' }], provider_account_id: 'lab-a', scheduled_at: when(), location_type: 'facility', payment_method: 'card' });
    expect(created[0].items[0].price).toBe(95);
    expect(created[0].total).toBe(95);
    created.length = 0;
    await make().svc.book({ ...patient, id: 'p2' }, { items: [{ service_id: 'test-1' }], provider_account_id: 'lab-b', scheduled_at: when(), location_type: 'facility', payment_method: 'card' }).catch(() => undefined);
    const second = make();
    await second.svc.book({ ...patient, id: 'p3' }, { items: [{ service_id: 'test-1' }], provider_account_id: 'lab-b', scheduled_at: when(), location_type: 'facility', payment_method: 'card' });
    expect(second.created[0].total).toBe(130);
  });

  it("the lab's own per-test choice wins over its registration, and over a capability row; a test it does not price falls back to the catalogue", async () => {
    await seed();
    await col('provider_capabilities_lab').insertOne({ provider_account_id: 'lab-a', code: 'test-1', price: 100, available: true });
    expect((await ownPrices(mongoose.connection.db as never, 'lab', ['lab-a'], [{ id: 'test-1', short_code: 'T1' }])).get('lab-a')?.get('test-1')).toBe(100);   // capability row beats registration
    await col('provider_service_offers').insertOne({ provider_account_id: 'lab-a', vertical: 'lab', service_id: 'test-1', offered: true, where: 'both', insurance: true, price: 88 });
    const { svc, created } = make();
    await svc.book(patient, { items: [{ service_id: 'test-1' }], provider_account_id: 'lab-a', scheduled_at: when(), location_type: 'facility', payment_method: 'card' });
    expect(created[0].total).toBe(88);                                                                                                                                  // its own choice beats both
    await col('provider_service_offers').deleteMany({}); await col('provider_capabilities_lab').deleteMany({});
    await col('provider_profiles').updateOne({ account_id: 'lab-a' }, { $unset: { test_prices: '' } });
    const fallback = make();
    await fallback.svc.book({ ...patient, id: 'p4' }, { items: [{ service_id: 'test-1' }], provider_account_id: 'lab-a', scheduled_at: when(), location_type: 'facility', payment_method: 'card' });
    expect(fallback.created[0].total).toBe(110);                                                                                                                        // no price anywhere: the catalogue
  });
});

describe('radiology: centre A registered 210, centre B 190; the catalogue says 250', () => {
  const seed = async () => {
    await col('radiology_services').insertOne({ id: 'scan-1', name_ar: 'أشعة', name_en: 'Scan', short_code: 'SC1', modality: 'mri', body_part: 'brain', price: 250, active: true, is_deleted: false, public_eligibility: true, medical_review_status: 'approved', home_visit_supported: false });
    await col('provider_profiles').insertMany([
      { id: 'prof-ca', account_id: 'rad-a', type: 'radiology', name_ar: 'مركز أ', name_en: 'Centre A', equipment_list: ['scan-1'], scan_prices: { 'scan-1': '210' }, scan_insurance_map: { 'scan-1': true }, ...approved },
      { id: 'prof-cb', account_id: 'rad-b', type: 'radiology', name_ar: 'مركز ب', name_en: 'Centre B', equipment_list: ['scan-1'], scan_prices: { 'scan-1': 190 }, scan_insurance_map: { 'scan-1': false }, ...approved },
    ] as never);
  };
  const make = () => {
    const { model, created } = bookingModel();
    const svc = new (RadiologyOpsService as any)(RadModel, model, {}, {}, {}, {}, ProfileModel, { announceCreated: async () => undefined }, { emit: jest.fn() });
    return { svc, created };
  };

  it('the list of centres, the comparison and the booking all use the centre\'s own price', async () => {
    await seed();
    const { svc, created } = make();
    const rows = await svc.compatibleProviders(['scan-1']);
    expect(Object.fromEntries(rows.map((r: any) => [r.id, r.price]))).toEqual({ 'rad-a': 210, 'rad-b': 190 });
    const cmp = await svc.priceComparison('scan-1');
    expect(cmp.catalog_price).toBe(250);
    expect(cmp.offers.map((o: any) => [o.provider.id, o.price, o.insurance_covered])).toEqual([['rad-b', 190, false], ['rad-a', 210, true]]);
    await svc.book(patient, { service_id: 'scan-1', provider_account_id: 'rad-a', scheduled_at: when(), payment_method: 'card' });
    expect(created[0].total).toBe(210);
    expect(created[0].items[0].price).toBe(210);
    const b = make();
    await b.svc.book({ ...patient, id: 'p2' }, { service_id: 'scan-1', provider_account_id: 'rad-b', scheduled_at: when(), payment_method: 'card' });
    expect(b.created[0].total).toBe(190);
  });
});

describe('nursing: nurse A registered 150, nurse B 120; the catalogue says 100', () => {
  const seed = async () => {
    await col('nursing_services').insertOne({ id: 'nur-1', name_ar: 'خدمة', name_en: 'Service', category: 'basic_nursing', price: 100, duration: 'hour', duration_value: 1, active: true, is_deleted: false, public_eligibility: true, medical_review_status: 'approved' });
    await col('provider_profiles').insertMany([
      { id: 'prof-na', account_id: 'nurse-a', type: 'home_care', name_ar: 'ممرضة أ', nursing_services: [{ key: 'nur-1', price: 150, insurance: true }], ...approved },
      { id: 'prof-nb', account_id: 'nurse-b', type: 'home_care', name_ar: 'ممرض ب', nursing_services: [{ key: 'nur-1', price: '120', insurance: false }], ...approved },
    ] as never);
  };
  const controller = () => new (HomeCareCompatController as any)({}, NurseSvcModel, ProfileModel, {});
  const service = () => {
    const { model, created } = bookingModel();
    return { svc: new (HomeCareSvc as any)(NurseSvcModel, model, {}, {}, {}, { emit: jest.fn() }, { announceCreated: async () => undefined }, { emit: async () => undefined }), created };
  };

  it('the nurse list and the nurse page show each nurse her own price and insurance', async () => {
    await seed();
    const rows = await controller().providers({ type: 'nur-1' });
    expect(Object.fromEntries(rows.map((r: any) => [r.id, [r.price, r.insurance]]))).toEqual({ 'nurse-a': [150, true], 'nurse-b': [120, false] });
    const one = await controller().provider('nurse-b', 'nur-1');
    expect([one.price, one.insurance]).toEqual([120, false]);
  });

  it('the booking is charged the nurse\'s price (150 / 120 x sessions), not the catalogue 100', async () => {
    await seed();
    const { svc, created } = service();
    await svc.book(patient, { service_id: 'nur-1', provider_id: 'nurse-a', scheduled_at: when(), payment_method: 'card' });
    expect(created[0].total).toBe(150);
    const b = service();
    await b.svc.book({ ...patient, id: 'p2' }, { service_id: 'nur-1', provider_id: 'nurse-b', scheduled_at: when(), payment_method: 'card', sessions_count: 2 });
    expect(b.created[0].total).toBe(240);
  });

  it('a nurse with no price of her own is charged the catalogue price (unchanged)', async () => {
    await seed();
    await col('provider_profiles').updateOne({ account_id: 'nurse-a' }, { $set: { nursing_services: [{ key: 'nur-1' }] } });
    const { svc, created } = service();
    await svc.book(patient, { service_id: 'nur-1', provider_id: 'nurse-a', scheduled_at: when(), payment_method: 'card' });
    expect(created[0].total).toBe(100);
  });
});
