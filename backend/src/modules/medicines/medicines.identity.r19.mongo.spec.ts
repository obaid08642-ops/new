// R19 single-id identity on a real Mongo: one medicine document per product,
// keyed by sku -> source_product_id -> barcode, with every locale merged into
// that one document's translations map.
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MedicinesService } from './medicines.service';
import { MedicineRepository } from './repositories/medicine.repository';
import { MedicineDocument, MedicineSchema } from '../../schemas/medicine.schema';
import { RedisService } from '../redis/redis.service';
import { CatalogPublicationService } from '../events/catalog-publication.service';

jest.setTimeout(60_000);

describe('MedicinesService R19 single-id identity (real Mongo)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let model: Model<MedicineDocument>;
  let svc: MedicinesService;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'r19identity', autoIndex: false }).asPromise();
    model = conn.model('Medicine', MedicineSchema) as unknown as Model<MedicineDocument>;
    svc = new MedicinesService(
      new MedicineRepository(model),
      new EventEmitter2(),
      {} as unknown as RedisService,
      conn,
      {} as unknown as CatalogPublicationService,
    );
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => { await model.deleteMany({}); });

  const LOCALE_ROWS: Array<[string, string]> = [
    ['ar', 'باراسيتامول'], ['en', 'Paracetamol'], ['ur', 'پیراسیٹامول'],
    ['hi', 'पैरासिटामोल'], ['bn', 'প্যারাসিটামল'], ['fil', 'Parasetamol'],
  ];

  it('imports one product in 6 locales as exactly one document carrying all 6 locales', async () => {
    const rows = LOCALE_ROWS.map(([locale, name]) => ({
      name_ar: 'باراسيتامول 500', sku: '900001', translations: { [locale]: { name } },
    }));
    const out = await svc.bulkImport(rows, 'admin-1', 'admin');
    expect(out.failed).toBe(0);
    expect(await model.countDocuments({})).toBe(1);
    const doc = await model.findOne({ sku: 900001 }).lean();
    // Filipino is stored under `tl` (Q90); the other five under their own code.
    expect(Object.keys(doc?.translations || {}).sort()).toEqual(['ar', 'bn', 'en', 'hi', 'tl', 'ur']);
    expect(doc?.translations?.tl?.name).toBe('Parasetamol');
    expect(doc?.translations?.ur?.name).toBe('پیراسیٹامول');
  });

  it('barcode is an identity: same barcode under different names stays one document', async () => {
    await svc.bulkImport([
      { name_ar: 'اسم أول', barcode: '6281234567890', translations: { ur: { name: 'اول' } } },
      { name_ar: 'اسم ثان', barcode: '6281234567890', translations: { hi: { name: 'दूसरा' } } },
    ], 'admin-1', 'admin');
    expect(await model.countDocuments({})).toBe(1);
    const doc = await model.findOne({ barcode: '6281234567890' }).lean();
    expect(doc?.translations?.ur?.name).toBe('اول');
    expect(doc?.translations?.hi?.name).toBe('दूसरा');
  });

  it('sku and source_product_id are identities ahead of barcode and name', async () => {
    await svc.bulkImport([
      { name_ar: 'أ', sku: '700', barcode: 'B-1' },
      { name_ar: 'ب', sku: '700', barcode: 'B-2' },
      { name_ar: 'ج', source_product_id: '4411' },
      { name_ar: 'د', sourceProductId: '4411' },
    ], 'admin-1', 'admin');
    expect(await model.countDocuments({ sku: 700 })).toBe(1);
    expect(await model.countDocuments({ source_product_id: 4411 })).toBe(1);
    expect(await model.countDocuments({})).toBe(2);
  });

  it('refuses a sku whose leading zeros would be lost (row fails, nothing written)', async () => {
    const out = await svc.bulkImport([{ name_ar: 'صفر', sku: '00123' }], 'admin-1', 'admin');
    expect(out.failed).toBe(1);
    expect(String(out.failed_rows[0].error)).toContain('sku must be digits without leading zeros');
    expect(await model.countDocuments({})).toBe(0);
    await expect(svc.adminCreateCatalog({ name_ar: 'صفر', sku: '0042' }, 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('admin create with an existing barcode answers 409 with the existing id and changes nothing', async () => {
    const first = await svc.adminCreateCatalog({ name_ar: 'منتج', barcode: 'BC-77', price: 10 }, 'admin-1');
    const dup = svc.adminCreateCatalog({ name_ar: 'منتج آخر', barcode: 'BC-77', price: 99, translations: { ur: { name: 'x' } } }, 'admin-1');
    await expect(dup).rejects.toBeInstanceOf(ConflictException);
    await dup.catch((e: ConflictException) => {
      expect(e.getResponse()).toEqual(expect.objectContaining({ message: 'duplicate_product', existing_id: first.id, matched_on: 'barcode' }));
    });
    expect(await model.countDocuments({})).toBe(1);
    const doc = await model.findOne({ id: first.id }).lean();
    expect(doc?.price).toBe(10);
    expect(doc?.name_ar).toBe('منتج');
  });

  it('admin create stores sku as the identity so a later create with that sku is refused', async () => {
    const first = await svc.adminCreateCatalog({ name_ar: 'سكو', sku: '81234' }, 'admin-1');
    expect((await model.findOne({ id: first.id }).lean())?.sku).toBe(81234);
    await expect(svc.adminCreateCatalog({ name_ar: 'سكو مكرر', sku: '81234' }, 'admin-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('accepts only allow-listed translation field keys (no slug)', async () => {
    const { id } = await svc.adminCreateCatalog({
      name_ar: 'ترجمة', translations: { ur: { name: 'نام', slug: 'hijacked-slug', evil: 'x' }, xx: { name: 'bad locale' } },
    }, 'admin-1');
    const doc = await model.findOne({ id }).lean();
    expect(doc?.translations).toEqual({ ur: { name: 'نام' } });
  });

  it('merging a locale keeps the stored map (imported slug and search_aliases are not dropped)', async () => {
    await model.create({
      id: 'med-keep', name_ar: 'محفوظ', barcode: 'KEEP-1', price: 5,
      translations: { ur: { name: 'پرانا', slug: 'purana-slug', search_aliases: ['a', 'b'] } },
    });
    await svc.createManualEntry({ name_ar: 'محفوظ', barcode: 'KEEP-1', translations: { ur: { name: 'نیا' }, bn: { name: 'নতুন' } } }, 'u1', 'pharmacy');
    const doc = await model.findOne({ id: 'med-keep' }).lean();
    expect(doc?.translations?.ur).toEqual({ name: 'نیا', slug: 'purana-slug', search_aliases: ['a', 'b'] });
    expect(doc?.translations?.bn).toEqual({ name: 'নতুন' });
    expect(await model.countDocuments({})).toBe(1);
  });
});
