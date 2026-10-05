// 7982518 (13.R10): nothing wrote `analytics_events`, so the admin search
// analytics / zero-result / CTR reports were always empty. The global search
// that both patient clients call (GET /home/search) now records a search
// event, and the admin report counts it. Real MongoDB end to end.
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { HomeService } from './home.service';
import { PromotionCampaign, PromotionCampaignSchema } from '../../schemas/promotion-campaign.schema';
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';
import { AnalyticsSuiteService } from '../admin/enterprise/analytics-suite.service';

jest.setTimeout(60_000);

describe('global search writes analytics_events that the admin report reads (real MongoDB)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let home: HomeService;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'search_analytics' }).asPromise();
    const promo = conn.model(PromotionCampaign.name, PromotionCampaignSchema);
    home = new HomeService(promo as never, {} as never, { user: { id: 'patient-1' } });
    await conn.db!.collection(CATALOG_COLLECTIONS.medicines).insertOne({ id: 'med-1', verified: true, name_ar: 'بنادول', name_en: 'Panadol', price: 12 });
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  it('records each search with the normalised query, the result count and the user', async () => {
    const results = await home.globalSearch('Panadol');
    expect(results).toHaveLength(1);
    await home.globalSearch('zzz-nothing');

    const rows = await conn.db!.collection('analytics_events').find({ event_type: 'search' }).sort({ createdAt: 1 }).toArray();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ event_type: 'search', domain: 'global', user_id: 'patient-1', metadata: { query: 'panadol', results: 1 } });
    expect(rows[1]).toMatchObject({ metadata: { query: 'zzz-nothing', results: 0 } });
    expect(rows[0].createdAt).toBeInstanceOf(Date);
  });

  it('the admin search analytics and CTR report count those searches', async () => {
    const suite = new AnalyticsSuiteService(conn);
    const from = new Date(Date.now() - 3600_000).toISOString();
    const to = new Date(Date.now() + 3600_000).toISOString();
    const report = await suite.searchAnalytics(from, to);
    expect(report.top_queries.map((r) => r._id).sort()).toEqual(['panadol', 'zzz-nothing']);
    expect(report.zero_result_opportunities.map((r) => r._id)).toEqual(['zzz-nothing']);
    const ctr = await suite.searchClickThrough(from, to);
    expect(ctr.overall).toMatchObject({ searches: 2, clicks: 0 });
  });

  it('a failing analytics write never fails the patient search', async () => {
    const promo = conn.model(PromotionCampaign.name);
    const broken = new HomeService(promo as never, {} as never, { user: { id: 'patient-1' } });
    const spy = jest.spyOn(promo.db, 'collection');
    spy.mockImplementation(((name: string) => {
      if (name === 'analytics_events') return { insertOne: () => Promise.reject(new Error('write down')) };
      return conn.db!.collection(name);
    }) as never);
    try {
      await expect(broken.globalSearch('Panadol')).resolves.toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });
});
