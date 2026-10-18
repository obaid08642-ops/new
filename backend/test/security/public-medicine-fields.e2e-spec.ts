/**
 * Issue 1555: no public medicine or catalogue route returns an internal field of a catalogue record.
 *
 * Boots the REAL public controllers (medicines, static catalogue shards, SEO resolve, recommendations, reference
 * catalogues) with the REAL production guards over HTTP, anonymously. The service layer is a fake that answers the way
 * the real one does (whole records, as stored), with a record that carries every internal field. Each response is then
 * scanned at every depth: no internal key may appear anywhere.
 */
import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken } from '@nestjs/mongoose';
import request from 'supertest';
import { JwtAuthGuard } from '../../src/common/auth.guard';
import { WriteGuard } from '../../src/common/write-guard';
import { RedisCacheInterceptor } from '../../src/common/redis-cache.interceptor';
import { ImpersonationSessionService } from '../../src/common/impersonation-session.service';
import { MedicinesController, PublicCatalogController } from '../../src/modules/medicines/medicines.controller';
import { MedicinesService } from '../../src/modules/medicines/medicines.service';
import { SeoController } from '../../src/modules/seo-search/seo.controller';
import { SeoService } from '../../src/modules/seo-search/seo.service';
import { IndexNowService } from '../../src/modules/seo-search/indexnow.service';
import { SeoSearchController, SeoSearchService } from '../../src/modules/seo-search/seo-search.module';
import { CatalogsController } from '../../src/modules/catalogs/catalogs.controller';

jest.setTimeout(120_000);

const SECRET = 'public-medicine-fields-secret';

/** Keys that must never reach an anonymous caller. */
const FORBIDDEN = [
  '_id', '__v', 'provenance', 'source', 'source_product_id', 'pending_revision', 'review_reason', 'created_by',
  'created_by_user_id', 'created_by_role', 'updated_by', 'deleted_at', 'is_deleted', 'aggregate_stock', 'pharmacies_count',
  'medical_review_status', 'public_eligibility', 'indexing_eligibility', 'approved_by', 'approved_at', 'rejected_reason',
  'change_requests', 'translation_conflict', 'usage_count', 'verified', 'version', 'search_text',
];
/** Public by owner decision (2026-10-16): the date of the last medical review is a trust signal. */
const ALLOWED = ['last_reviewed'];
const FORBIDDEN_PATTERNS = [/review/i, /^provenance/i, /^source/i, /^created_by/i, /^updated_by/i, /password|secret/i];

function leakedKeys(value: unknown, path = '$'): string[] {
  if (Array.isArray(value)) return value.flatMap((v, i) => leakedKeys(v, `${path}[${i}]`));
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => [
    ...(!ALLOWED.includes(k) && (FORBIDDEN.includes(k) || FORBIDDEN_PATTERNS.some((re) => re.test(k))) ? [`${path}.${k}`] : []),
    ...leakedKeys(v, `${path}.${k}`),
  ]);
}

/** A published medicine as stored, with every internal field the record can carry. */
function record(id: string, extra: Record<string, unknown> = {}) {
  return {
    _id: '65f000000000000000000001', __v: 3,
    id, slug: `med-${id}`, sku: 1001, name_ar: 'دواء', name_en: 'Medicine', active_ingredient: 'paracetamol',
    category: 'medications', form: 'tablet', strength: '500mg', package_size: '20', price: 12, old_price: 15,
    requires_prescription: false, online_exclusive: false, availability_status: 'none', image_1: 'img/a.png',
    translations: { ur: { name: 'دوا', slug: `ur-${id}` } },
    provenance: 'import:2026-09', source: 'master', source_product_id: 99, pending_revision: { changes: { price: 1 }, submitted_by: 'u1', submitted_at: new Date() },
    review_reason: 'checked', created_by: 'admin-1', created_by_user_id: 'admin-1', created_by_role: 'admin', updated_by: 'admin-2',
    deleted_at: null, is_deleted: false, aggregate_stock: 140, pharmacies_count: 7, medical_review_status: 'approved',
    public_eligibility: true, indexing_eligibility: true, approved_by: 'admin-3', approved_at: new Date(), rejected_reason: null,
    last_reviewed: new Date(), change_requests: [{ by: 'u2' }], translation_conflict: false, usage_count: 50, verified: true,
    version: 4, search_text: 'dwa medicine',
    ...extra,
  };
}

describe('Issue 1555: public medicine routes return public fields only', () => {
  let app: INestApplication;
  const rx = record('m-rx', { requires_prescription: true, old_price: 30, price: 20 });
  const svc = {
    list: jest.fn(async () => [record('m1')]),
    paginate: jest.fn(async () => ({ data: [record('m1')], total: 1, page: 1, limit: 30, total_pages: 1 })),
    cursorPage: jest.fn(async () => ({ data: [record('m1')], limit: 30, has_more: false, next_cursor: null })),
    filtered: jest.fn(async () => [record('m1')]),
    autocomplete: jest.fn(async () => [record('m1')]),
    byBarcode: jest.fn(async () => ({ found: true, source: 'catalog', medicine: record('m1'), codes_tried: ['6281'] })),
    categories: jest.fn(async () => [{ slug: 'medications', count: 1, sub_categories: [] }]),
    filters: jest.fn(async () => ({ categories: ['medications'], brands: [], forms: ['tablet'], sortOptions: ['relevant'] })),
    compare: jest.fn(async () => [record('m1'), rx]),
    hot: jest.fn(async () => [record('m1')]),
    didYouMean: jest.fn(async () => ({ suggestion: null })),
    trendingSearches: jest.fn(async () => [{ term: 'panadol', searches: 3 }]),
    getPublicById: jest.fn(async () => record('m1')),
    details: jest.fn(async () => ({
      ...record('m1'),
      alternatives: [record('m2'), rx],
      stock_status: { aggregate_stock: 140, pharmacies_count: 7, in_stock: true },
    })),
    alternatives: jest.fn(async () => [record('m2'), rx]),
    publicCatalogFragment: jest.fn(async () => [{ id: 'm1', slug: 'med-m1', name: 'دواء', category: 'medications', form: 'tablet', strength: '500mg', price: 12, image: null, requires_prescription: false, availability_status: 'none' }]),
    buildQuery: jest.fn((_search?: string, _category?: string, _includeUnverified?: boolean) => ({ is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' })),
    // As MedicinesService.publicStreamFilter: the stream filter is buildQuery with includeUnverified false.
    publicStreamFilter: jest.fn((search?: string, category?: string) => svc.buildQuery(search, category, false)),
    model: {
      find: jest.fn(() => ({
        lean: () => ({ batchSize: () => ({ cursor: () => (async function* () { yield record('m1'); })() }) }),
      })),
    },
  };
  const seo = { resolve: jest.fn(async () => record('m1')) };
  const seoSearch = {
    medicineRecommendations: jest.fn(async () => ({
      strategy: 'ingredient>strength>category>brand>popularity',
      items: [{ ...record('m2'), recommend_score: 60, recommend_reasons: ['x'] }, { ...rx, recommend_score: 50, recommend_reasons: ['y'] }],
      ai_rank_ready: true,
    })),
  };
  const connection = {
    collection: (name: string) => ({
      findOne: async () => null,
      insertOne: async () => ({}),
      find: () => ({ limit: () => ({ toArray: async () => (name.startsWith('medicines') ? [record('m1')] : []) }) }),
    }),
    model: () => null,
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRET;
    const moduleRef = await Test.createTestingModule({
      controllers: [MedicinesController, PublicCatalogController, SeoController, SeoSearchController, CatalogsController],
      providers: [
        { provide: MedicinesService, useValue: svc },
        { provide: SeoService, useValue: seo },
        { provide: IndexNowService, useValue: {} },
        { provide: SeoSearchService, useValue: seoSearch },
        { provide: JwtService, useValue: new JwtService({ secret: SECRET }) },
        Reflector,
        { provide: getConnectionToken(), useValue: connection },
        { provide: ImpersonationSessionService, useValue: {} },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: WriteGuard },
      ],
    })
      .overrideInterceptor(RedisCacheInterceptor)
      .useValue({ intercept: (_ctx: unknown, next: { handle: () => unknown }) => next.handle() })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  });
  afterAll(async () => { await app?.close(); });

  // Four entries per row: jest.each reads a fourth function parameter with no value as a done callback.
  const routes: Array<[string, 'get' | 'post', string, Record<string, unknown> | null]> = [
    ['list', 'get', '/api/v1/medicines?search=med', null],
    ['list (page)', 'get', '/api/v1/medicines?page=1', null],
    ['list (cursor)', 'get', '/api/v1/medicines?cursor=', null],
    ['list (filtered)', 'get', '/api/v1/medicines?sort=price_asc', null],
    ['autocomplete', 'get', '/api/v1/medicines/autocomplete?q=med', null],
    ['categories', 'get', '/api/v1/medicines/categories', null],
    ['filters', 'get', '/api/v1/medicines/filters', null],
    ['compare', 'post', '/api/v1/medicines/compare', { ids: ['m1', 'm-rx'] }],
    ['hot', 'get', '/api/v1/medicines/hot', null],
    ['did-you-mean', 'get', '/api/v1/medicines/search/did-you-mean?q=med', null],
    ['trending', 'get', '/api/v1/medicines/search/trending', null],
    ['stream', 'get', '/api/v1/medicines/stream', null],
    ['detail', 'get', '/api/v1/medicines/m1', null],
    ['details', 'get', '/api/v1/medicines/m1/details', null],
    ['alternatives', 'get', '/api/v1/medicines/m1/alternatives', null],
    ['catalogue shard', 'get', '/api/v1/public/catalog/ar/medications.json', null],
    ['seo resolve', 'get', '/api/v1/seo/resolve/medicine/med-m1', null],
    ['recommendations', 'get', '/api/v1/medicines/m1/recommendations', null],
    ['reference catalogue', 'get', '/api/v1/catalogs/medicines', null],
  ];

  it.each(routes)('%s: anonymous, no internal field anywhere in the answer', async (_name, method, path, body) => {
    const res = method === 'post' ? await request(app.getHttpServer()).post(path).send(body || {}) : await request(app.getHttpServer()).get(path);
    expect(res.status).toBeLessThan(300);
    const payload = path.endsWith('/stream') ? JSON.parse(res.text) : res.body;
    expect(leakedKeys(payload)).toEqual([]);
  });

  it.each([
    ['by-barcode', 'get', '/api/v1/medicines/by-barcode/6281', null],
    ['lookup-barcode', 'post', '/api/v1/medicines/lookup-barcode'],
  ])('%s: the matched medicine carries no internal field', async (_name, method, path) => {
    const res = method === 'post' ? await request(app.getHttpServer()).post(path).send({ code: '6281' }) : await request(app.getHttpServer()).get(path);
    expect(res.status).toBeLessThan(300);
    expect(res.body.found).toBe(true);
    expect(res.body.medicine.id).toBe('m1');
    expect(leakedKeys(res.body.medicine)).toEqual([]);
  });

  it('alternatives: the public product card of /public/products/search, with no old price on a prescription item', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/medicines/m1/alternatives?locale=en').expect(200);
    expect(res.body.map((c: { id: string }) => c.id)).toEqual(['m2', 'm-rx']);
    expect(Object.keys(res.body[0]).sort()).toEqual([
      'active_ingredient', 'available', 'category', 'currency', 'description', 'form', 'id', 'image', 'is_rx', 'manufacturer',
      'name', 'official_name', 'old_price', 'online_exclusive', 'package_size', 'price', 'sku', 'slug', 'strength', 'sub_category', 'url',
    ]);
    expect(res.body[0].old_price).toBe(15);
    expect(res.body[1]).toMatchObject({ is_rx: true, price: 20, old_price: null });
  });

  it('details, compare, recommendations: no old price or discount on a prescription item', async () => {
    const details = await request(app.getHttpServer()).get('/api/v1/medicines/m1/details').expect(200);
    const rxAlt = details.body.alternatives.find((a: { id: string }) => a.id === 'm-rx');
    expect(rxAlt.old_price).toBeUndefined();
    expect(details.body.stock_status).toEqual({ in_stock: true });
    const compare = await request(app.getHttpServer()).post('/api/v1/medicines/compare').send({ ids: ['m1', 'm-rx'] });
    expect(compare.body.find((m: { id: string }) => m.id === 'm-rx').old_price).toBeUndefined();
    const recs = await request(app.getHttpServer()).get('/api/v1/medicines/m1/recommendations').expect(200);
    expect(recs.body.items.find((m: { id: string }) => m.id === 'm-rx').old_price).toBeUndefined();
  });

  it('stream: reads the public catalogue only', async () => {
    svc.buildQuery.mockClear();
    await request(app.getHttpServer()).get('/api/v1/medicines/stream?search=med').expect(200);
    expect(svc.buildQuery).toHaveBeenCalledWith('med', undefined, false);
  });
});
