/**
 * Every `slugs.<locale>` of the public product DTO resolves through GET /public/product/:locale/:slug (the service behind it), a product
 * with no slug is linked by its id and that resolves too, and a product that is not public never does. In-memory MongoDB.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SeoSearchService } from './seo-search.module';
import { PUBLIC_CATALOG_LOCALES } from '../medicines/med-i18n';
import { slugHealth } from '../medicines/content-coverage';

jest.setTimeout(120_000);
let mongod: MongoMemoryServer;
let svc: SeoSearchService;
const pub = { public_eligibility: true, medical_review_status: 'approved' };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'public_slugs_test' });
  svc = new SeoSearchService(mongoose.connection);
  await mongoose.connection.db!.collection('medicines').insertMany([
    // own slug in every language
    { id: 'm1', name_ar: 'أ', name_en: 'A', slug: 'a-en', ...pub, translations: { ar: { slug: 'أ-عربي' }, en: { slug: 'a-en' }, ur: { slug: 'اردو-ا' }, hi: { slug: 'हिंदी-ए' }, bn: { slug: 'বাংলা-এ' }, tl: { slug: 'a-fil' } } },
    // root slug only: the other locales link with it
    { id: 'm2', name_ar: 'ب', name_en: 'B', slug: 'b-root', ...pub },
    // no slug at all: linked by its id
    { id: 'm3', name_ar: 'ج', name_en: 'C', ...pub },
    // not public: never resolves
    { id: 'm4', name_ar: 'د', name_en: 'D', slug: 'd-hidden', public_eligibility: false, medical_review_status: 'approved' },
  ]);
});
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

describe('slugs.<locale> resolve', () => {
  it('for every published product and locale, the slug the DTO links with finds the same product', async () => {
    for (const id of ['m1', 'm2', 'm3']) {
      const dto: any = await svc.publicProductById('ar', id);
      for (const locale of PUBLIC_CATALOG_LOCALES) {
        const found: any = await svc.publicProductBySlug(locale, dto.slugs[locale]);
        expect(found.id).toBe(id);
        expect(found.locale).toBe(locale);
      }
    }
  });
  it('a locale slug is looked up in its own language first', async () => {
    expect((await svc.publicProductBySlug('ur', 'اردو-ا') as any).id).toBe('m1');
    expect((await svc.publicProductBySlug('hi', 'हिंदी-ए') as any).slugs.hi).toBe('हिंदी-ए');
  });
  it('an unpublished product and an unknown slug are 404', async () => {
    await expect(svc.publicProductBySlug('en', 'd-hidden')).rejects.toThrow('product_not_found');
    await expect(svc.publicProductBySlug('en', 'd')).rejects.toThrow('product_not_found');
    await expect(svc.publicProductBySlug('en', 'nope')).rejects.toThrow('product_not_found');
  });
  it('slugs are unique per locale in this sample, and the health counter agrees', async () => {
    const rows = (await mongoose.connection.db!.collection('medicines').find({ public_eligibility: true }).toArray()) as Array<Record<string, any>>;
    for (const locale of PUBLIC_CATALOG_LOCALES) expect(slugHealth(rows, locale).duplicates).toBe(0);
    expect(slugHealth(rows, 'ur')).toMatchObject({ products: 3, own_slug: 1, root_slug_only: 1, id_only: 1, unresolvable: 0 });
  });
});
