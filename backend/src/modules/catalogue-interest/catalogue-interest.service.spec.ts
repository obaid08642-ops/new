import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NotFoundException } from '@nestjs/common';
import { CatalogueInterestService, INTEREST_COLLECTION } from './catalogue-interest.service';

jest.setTimeout(120_000);
let mongod: MongoMemoryServer;
const raw = () => mongoose.connection.db!;
const col = (n: string) => raw().collection(n);
const sent: any[] = [];
const notifications: any = { create: jest.fn(async (n: any) => { sent.push(n); return n; }) };
let svc: CatalogueInterestService;
const visible = { active: true, is_deleted: false, public_eligibility: true, medical_review_status: 'approved' };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'catalogue_interest_test' });
  svc = new CatalogueInterestService(mongoose.connection as never, notifications);
  await svc.onModuleInit();
});
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });
beforeEach(async () => {
  sent.length = 0;
  for (const c of await raw().listCollections().toArray()) await col(c.name).deleteMany({});
  await col('radiology_services').insertMany([
    { id: 'PETCT', short_code: 'PETCT', name_ar: 'تصوير مقطعي بالبوزيترون', name_en: 'PET-CT', modality: 'pet', body_part: 'whole_body', ...visible },
    { id: 'MAMMO', short_code: 'MAMMO', name_ar: 'ماموغرام', name_en: 'Mammography', modality: 'mammography', body_part: 'breast', ...visible },
    { id: 'HIDDEN', short_code: 'HIDDEN', name_ar: 'مخفي', modality: 'xray', ...visible, public_eligibility: false, medical_review_status: 'pending' },
  ]);
  await col('lab_services').insertOne({ id: 'CBC', short_code: 'CBC', name_ar: 'صورة دم', name_en: 'CBC', category: 'hematology', active: true, public_eligibility: true, medical_review_status: 'approved' });
});

describe('catalogue interest ("notify me when available")', () => {
  it('stores one interest per patient and service, whatever the number of taps, and says there is no provider yet', async () => {
    const a = await svc.add('p1', 'radiology', 'PETCT');
    const b = await svc.add('p1', 'radiology', 'PETCT');
    expect(a).toMatchObject({ ok: true, interested: true, providers_count: 0, from_price: null });
    expect(b.interested).toBe(true);
    expect(await col(INTEREST_COLLECTION).countDocuments({})).toBe(1);
    await svc.add('p2', 'radiology', 'PETCT');
    expect(await col(INTEREST_COLLECTION).countDocuments({})).toBe(2);
  });

  it('refuses a service that is not in the visible catalogue (unknown, or pending review)', async () => {
    await expect(svc.add('p1', 'radiology', 'HIDDEN')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.add('p1', 'radiology', 'NOPE')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.add('p1', 'lab', 'PETCT')).rejects.toBeInstanceOf(NotFoundException);          // a scan id under the wrong vertical
    expect(await col(INTEREST_COLLECTION).countDocuments({})).toBe(0);
  });

  it('remove is idempotent and only removes the caller\'s own interest; mine lists them', async () => {
    await svc.add('p1', 'radiology', 'PETCT'); await svc.add('p1', 'lab', 'CBC'); await svc.add('p2', 'radiology', 'PETCT');
    expect((await svc.mine('p1')).map((r) => `${r.service_type}:${r.service_id}`).sort()).toEqual(['lab:CBC', 'radiology:PETCT']);
    expect(await svc.remove('p1', 'radiology', 'PETCT')).toMatchObject({ interested: false, removed: true });
    expect(await svc.remove('p1', 'radiology', 'PETCT')).toMatchObject({ removed: false });
    expect(await col(INTEREST_COLLECTION).countDocuments({ user_id: 'p2' })).toBe(1);
  });

  it('the admin demand is per service, biggest first, with names and counts but never who asked', async () => {
    await svc.add('p1', 'radiology', 'PETCT'); await svc.add('p2', 'radiology', 'PETCT'); await svc.add('p3', 'radiology', 'PETCT'); await svc.add('p1', 'radiology', 'MAMMO');
    const d = await svc.demand();
    expect(d.map((r) => [r.service_id, r.interested, r.still_waiting])).toEqual([['PETCT', 3, 3], ['MAMMO', 1, 1]]);
    expect(d[0]).toMatchObject({ service_type: 'radiology', name_en: 'PET-CT', name_ar: 'تصوير مقطعي بالبوزيترون' });
    expect(JSON.stringify(d)).not.toMatch(/p1|p2|p3|user_id/);
    expect((await svc.demand('lab'))).toEqual([]);
  });

  it('the sweep tells each waiting patient once, only when a provider offers the service', async () => {
    await svc.add('p1', 'radiology', 'PETCT'); await svc.add('p2', 'radiology', 'PETCT'); await svc.add('p3', 'radiology', 'MAMMO');
    expect(await svc.sweep()).toBe(0);                                          // nobody offers anything
    await col('provider_profiles').insertOne({ account_id: 'rad1', type: 'radiology', name_ar: 'مركز', status: 'active', public_eligibility: true, medical_review_status: 'approved', equipment_list: ['pet'] });
    expect(await svc.sweep()).toBe(2);                                          // PETCT now has a centre; MAMMO still none
    expect(sent.map((n) => [n.user_id, n.title_key, n.action.route]).sort()).toEqual([['p1', 'notif.service_available.title', '/diagnostics/radiology/PETCT'], ['p2', 'notif.service_available.title', '/diagnostics/radiology/PETCT']]);
    expect(await svc.sweep()).toBe(0);                                          // once only
    expect((await svc.demand()).find((r) => r.service_id === 'PETCT')).toMatchObject({ interested: 2, still_waiting: 0 });
    expect((await svc.demand()).find((r) => r.service_id === 'MAMMO')).toMatchObject({ still_waiting: 1 });
  });
});
