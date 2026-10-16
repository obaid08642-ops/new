import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RumService } from './rum.service';
import { RumReportDto } from './rum.dto';

jest.setTimeout(120_000);

describe('P14.23 RUM', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let rum: RumService;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(`${mongo.getUri()}rum_test`).asPromise();
    rum = new RumService(conn);
    await rum.onModuleInit();
  });
  afterAll(async () => {
    await conn?.close();
    await mongo?.stop();
  });

  const errors = async (body: unknown) => (await validate(plainToInstance(RumReportDto, body), { whitelist: true, forbidNonWhitelisted: true })).length;

  it('accepts a page view report and refuses anything outside the lists', async () => {
    const ok = { page_type: 'product', locale: 'ar', device: 'mobile', samples: [{ name: 'LCP', value: 1800, rating: 'good', nav: 'navigate' }] };
    expect(await errors(ok)).toBe(0);
    expect(await errors({ ...ok, page_type: '/ar/p/secret-slug' })).toBeGreaterThan(0);
    expect(await errors({ ...ok, locale: 'fr' })).toBeGreaterThan(0);
    expect(await errors({ ...ok, samples: [] })).toBeGreaterThan(0);
    expect(await errors({ ...ok, samples: Array(6).fill(ok.samples[0]) })).toBeGreaterThan(0);
    expect(await errors({ ...ok, samples: [{ name: 'XYZ', value: 1, rating: 'good' }] })).toBeGreaterThan(0);
    expect(await errors({ ...ok, samples: [{ name: 'LCP', value: -1, rating: 'good' }] })).toBeGreaterThan(0);
    expect(await errors({ ...ok, user_id: 'u1' })).toBeGreaterThan(0);
  });

  it('stores samples with no user data and a 30-day TTL', async () => {
    await rum.record({ page_type: 'home', locale: 'ar', device: 'mobile', samples: [{ name: 'CLS', value: 0.05, rating: 'good' }] } as RumReportDto);
    const doc = await conn.collection('rum_vitals').findOne({ page_type: 'home' });
    expect(Object.keys(doc!).sort()).toEqual(['_id', 'at', 'device', 'locale', 'metric', 'nav', 'page_type', 'rating', 'value']);
    const ttl = (await conn.collection('rum_vitals').indexes()).find((i) => i.expireAfterSeconds !== undefined);
    expect(ttl?.expireAfterSeconds).toBe(30 * 86_400);
  });

  it('summarises p75 per page type and metric against the budgets', async () => {
    const lcp = [1000, 1200, 1500, 1800, 2100, 2400, 2600, 3000];
    for (const value of lcp) {
      await rum.record({ page_type: 'product', locale: 'ar', samples: [{ name: 'LCP', value, rating: value <= 2500 ? 'good' : 'poor' }] } as RumReportDto);
    }
    const { rows, samples } = await rum.summary(1);
    const row = rows.find((r) => r.page_type === 'product' && r.metric === 'LCP')!;
    expect(row.count).toBe(8);
    expect(row.p75).toBeGreaterThanOrEqual(2100);
    expect(row.p75).toBeLessThanOrEqual(2600);
    expect(row.good_ratio).toBe(0.75);
    expect(row.budget).toBe(2000);
    expect(row.within_budget).toBe(false);
    expect(samples).toBeGreaterThanOrEqual(9);
  });
});
