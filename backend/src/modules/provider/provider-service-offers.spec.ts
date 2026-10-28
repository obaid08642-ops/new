import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ValidationPipe, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProviderServiceOffersService } from './services/provider-service-offers.service';
import { ProviderServiceOfferDto } from './provider-service-offers.dto';
import { UpsertHcDto, UpsertLabDto, UpsertRadDto } from './provider.controllers.generated.dto';
import { loadOffers, withOfferSummary } from '../../common/service-offers';

jest.setTimeout(120_000);
let mongod: MongoMemoryServer;
const raw = () => mongoose.connection.db!;
const col = (n: string) => raw().collection(n);
const audit: any = { create: jest.fn(async () => undefined) };
let svc: ProviderServiceOffersService;
const approved = { status: 'active', public_eligibility: true, medical_review_status: 'approved' };
const labUser = { id: 'lab1', role: 'lab' };
const radUser = { id: 'rad1', role: 'radiology' };
const nurseUser = { id: 'nur1', role: 'nurse' };
const pharmacyUser = { id: 'ph1', role: 'pharmacy' };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'provider_offers_test' });
  svc = new ProviderServiceOffersService(mongoose.connection as never, audit);
  await svc.onModuleInit();
});
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });
beforeEach(async () => {
  audit.create.mockClear();
  for (const c of await raw().listCollections().toArray()) await col(c.name).deleteMany({});
  await col('provider_profiles').insertMany([
    { account_id: 'lab1', type: 'lab', name_ar: 'مختبر', ...approved, test_categories: [] },
    { account_id: 'rad1', type: 'radiology', name_ar: 'مركز', ...approved, equipment_list: ['xray'] },
    { account_id: 'nur1', type: 'home_care', name_ar: 'ممرض', ...approved, nursing_services: [] },
    { account_id: 'ph1', type: 'pharmacy', name_ar: 'صيدلية', ...approved },
  ]);
  const ok = { active: true, public_eligibility: true, medical_review_status: 'approved' };
  await col('lab_services').insertMany([{ id: 'CBC', short_code: 'CBC', name_ar: 'صورة دم', name_en: 'CBC', category: 'hematology', price: 50, home_visit_supported: true, ...ok }, { id: 'IMG', short_code: 'IMG', name_ar: 'صورة', category: 'imaging', ...ok }, { id: 'OLD', short_code: 'OLD', name_ar: 'قديم', ...ok, public_eligibility: false, medical_review_status: 'pending' }]);
  await col('radiology_services').insertMany([{ id: 'PETCT', short_code: 'PETCT', name_ar: 'بوزيترون', name_en: 'PET-CT', modality: 'pet', body_part: 'whole_body', price: 3500, is_deleted: false, ...ok }]);
  await col('nursing_services').insertMany([{ id: 'n-inj', code: 'INJ', name_ar: 'حقن', name_en: 'Injection', category: 'injections', price: 60, ...ok }]);
});

describe('ProviderServiceOfferDto (what the provider may send)', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const run = async (cls: any, body: any) => { try { await pipe.transform(body, { type: 'body', metatype: cls }); return 'ok'; } catch (e: any) { return (e as BadRequestException).getResponse() as any; } };
  it('accepts the four choices', async () => {
    expect(await run(ProviderServiceOfferDto, { offered: true, where: 'both', insurance: true, price: 99.5 })).toBe('ok');
    expect(await run(ProviderServiceOfferDto, { offered: false })).toBe('ok');
  });
  it('rejects a missing flag, a wrong place, a bad price and anything else', async () => {
    for (const bad of [{}, { offered: 'yes' }, { offered: true, where: 'moon' }, { offered: true, price: -1 }, { offered: true, price: 'free' }, { offered: true, price: 1e9 }, { offered: true, provider_account_id: 'other' }, { offered: true, price: 10.123 }]) {
      expect(await run(ProviderServiceOfferDto, bad)).not.toBe('ok');
    }
  });
  it('the older capability endpoints accept their real fields now (they rejected price, available, home and insurance before)', async () => {
    expect(await run(UpsertLabDto, { code: 'CBC', name_ar: 'x', price: 50, available: true, home_collection_supported: true, insurance_covered: true })).toBe('ok');
    expect(await run(UpsertRadDto, { scan_type: 'xray', body_part: 'chest', price: 50, insurance_covered: true, home_supported: false })).toBe('ok');
    expect(await run(UpsertHcDto, { service_type: 'nursing_visit', hourly_price: 50, available: true })).toBe('ok');
    expect(await run(UpsertLabDto, { code: 'CBC', name_ar: 'x', price: 'free' })).not.toBe('ok');
    expect(await run(UpsertLabDto, { code: 'CBC', name_ar: 'x', is_admin: true })).not.toBe('ok');
  });
});

describe('ProviderServiceOffersService', () => {
  it('lists the whole approved catalogue of the vertical with the provider\'s own options; imaging and pending tests are not in the lab list', async () => {
    const rows = await svc.list(labUser, 'lab');
    expect(rows.map((r) => r.service_id)).toEqual(['CBC']);
    expect(rows[0]).toMatchObject({ offered: false, where: null, insurance: false, price: null, catalogue_price: 50, home_visit_supported: true, name_en: 'CBC' });
    expect((await svc.list(radUser, 'radiology')).map((r) => r.service_id)).toEqual(['PETCT']);       // a scan nobody offers is still listed to the provider
  });

  it('the choice is saved, read back, audited, and the patient list then shows the provider (price, where, insurance)', async () => {
    const saved = await svc.set(labUser, 'lab', 'CBC', { offered: true, where: 'both', insurance: true, price: 45 });
    expect(saved).toMatchObject({ offered: true, where: 'both', insurance: true, price: 45 });
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'service_offer.changed', after: { offered: true, where: 'both', insurance: true, price: 45 } }));
    const offers = (await loadOffers(raw() as never, 'lab', [{ id: 'CBC', short_code: 'CBC' }])).get('CBC')!;
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({ price: 45, premises: true, home: true, insurance: true });
    const [row] = await withOfferSummary(raw() as never, 'lab', [{ id: 'CBC', short_code: 'CBC' }], { home_only: true, insurance: true });
    expect(row).toMatchObject({ providers_count: 1, from_price: 45, home_available: true, insurance_accepted: true });
    expect((await col('provider_profiles').findOne({ account_id: 'lab1' }))!.test_categories).toEqual(['CBC']);   // booking checks read this list
  });

  it('where means exactly premises, home or both; a price of 0 or none is "no price"; the provider can stop offering', async () => {
    await svc.set(radUser, 'radiology', 'PETCT', { offered: true, where: 'premises', price: 0 });
    let [o] = [...(await loadOffers(raw() as never, 'radiology', [{ id: 'PETCT', modality: 'pet' }])).get('PETCT')!];
    expect(o).toMatchObject({ price: null, premises: true, home: false });
    await svc.set(radUser, 'radiology', 'PETCT', { offered: true, where: 'home', price: 3000 });
    [o] = [...(await loadOffers(raw() as never, 'radiology', [{ id: 'PETCT', modality: 'pet' }])).get('PETCT')!];
    expect(o).toMatchObject({ price: 3000, premises: false, home: true });
    const stopped = await svc.set(radUser, 'radiology', 'PETCT', { offered: false });
    expect(stopped).toMatchObject({ offered: false, where: null, price: null });
    expect((await loadOffers(raw() as never, 'radiology', [{ id: 'PETCT', modality: 'pet' }])).get('PETCT')).toEqual([]);
    expect((await col('provider_profiles').findOne({ account_id: 'rad1' }))!.equipment_list).toEqual(['xray']);        // the scan id is removed again, the modality entry stays
  });

  it('the provider\'s own "not offered" beats an older listing; with no choice the older sources still count', async () => {
    await col('provider_profiles').updateOne({ account_id: 'rad1' }, { $set: { equipment_list: ['pet'] } });
    expect((await loadOffers(raw() as never, 'radiology', [{ id: 'PETCT', modality: 'pet' }])).get('PETCT')).toHaveLength(1);   // listed by modality, no choice yet
    await svc.set(radUser, 'radiology', 'PETCT', { offered: false });
    expect((await loadOffers(raw() as never, 'radiology', [{ id: 'PETCT', modality: 'pet' }])).get('PETCT')).toEqual([]);
  });

  it('nursing: the default place is the patient\'s home, and the choice is mirrored into the profile list the booking check reads', async () => {
    const saved = await svc.set(nurseUser, 'nursing', 'n-inj', { offered: true, price: 70, insurance: true });
    expect(saved).toMatchObject({ offered: true, where: 'home', price: 70, insurance: true });
    expect((await col('provider_profiles').findOne({ account_id: 'nur1' }))!.nursing_services).toEqual([expect.objectContaining({ key: 'n-inj', price: 70, home: true, premises: false, insurance: true })]);
    await svc.set(nurseUser, 'nursing', 'n-inj', { offered: true, where: 'both', price: 80 });
    expect((await col('provider_profiles').findOne({ account_id: 'nur1' }))!.nursing_services).toHaveLength(1);       // replaced, not duplicated
    await svc.set(nurseUser, 'nursing', 'n-inj', { offered: false });
    expect((await col('provider_profiles').findOne({ account_id: 'nur1' }))!.nursing_services).toEqual([]);
  });

  it('only the right kind of provider, only approved catalogue services, only the caller\'s own options', async () => {
    await expect(svc.list(pharmacyUser, 'lab')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.set(labUser, 'radiology', 'PETCT', { offered: true })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.set(labUser, 'lab', 'OLD', { offered: true })).rejects.toBeInstanceOf(NotFoundException);            // pending review
    await expect(svc.set(labUser, 'lab', 'NOPE', { offered: true })).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.list(labUser, 'pharmacy')).rejects.toBeInstanceOf(BadRequestException);
    await svc.set(labUser, 'lab', 'CBC', { offered: true, price: 10 });
    expect((await svc.list({ id: 'someone-else', role: 'lab' }, 'lab').catch(() => 'forbidden'))).toBe('forbidden');   // no profile of the right type
    expect(await col('provider_service_offers').countDocuments({})).toBe(1);
  });

  it('the admin view shows who offers a service and how, ids and options only', async () => {
    await svc.set(labUser, 'lab', 'CBC', { offered: true, where: 'home', insurance: true, price: 40 });
    const v = await svc.adminView('lab', { service_id: 'CBC' });
    expect(v).toMatchObject({ vertical: 'lab', total: 1, offered: 1 });
    expect(v.items[0]).toMatchObject({ provider_account_id: 'lab1', service_id: 'CBC', where: 'home', insurance: true, price: 40 });
    expect(Object.keys(v.items[0]).sort()).toEqual(['currency', 'insurance', 'offered', 'price', 'provider_account_id', 'service_id', 'updatedAt', 'where']);
  });
});
