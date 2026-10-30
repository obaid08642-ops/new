/**
 * Popularity ranking of labs, radiology and nursing: the pure rules (bots, weights, decay, window, sort), the events (what counts, what does not, nothing personal stored),
 * the recompute (orders from the bookings + counters -> rank_score, idempotent, dry run writes nothing) and the controller's refusal of server-only events.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BadRequestException } from '@nestjs/common';
import { CatalogueRankingController } from './catalogue-ranking.controller';
import { CatalogueRankingService } from './catalogue-ranking.service';
import { DAILY_COLLECTION, catalogueSortSpec, dayKey, isBotUserAgent, normalizeCatalogueSort, scoreServices } from './catalogue-ranking';

jest.setTimeout(120_000);
const NOW = new Date('2026-10-29T12:00:00Z');
const day = (back: number) => dayKey(new Date(NOW.getTime() - back * 86_400_000));
const BROWSER = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36';

describe('pure rules', () => {
  it('bots, scripts and empty agents are not visitors; browsers and the apps are', () => {
    for (const ua of ['Googlebot/2.1', 'curl/8.5.0', 'HeadlessChrome/126', 'python-requests/2.31', 'Mozilla/5.0 (compatible; AhrefsBot/7.0)', 'Lighthouse', '', undefined, 'x']) expect(isBotUserAgent(ua)).toBe(true);
    for (const ua of [BROWSER, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148', 'NabdPlus/3.2.1 (Android 14; Pixel 8)']) expect(isBotUserAgent(ua)).toBe(false);
  });

  it('scores: order 5, cart add 3, search 1.5, view 1; a day old loses nothing, 30 days lose half; beyond 90 days nothing', () => {
    const s = scoreServices([
      { service_id: 'a', day: day(0), views: 10, searches: 2, cart_adds: 1, orders: 1 },     // 10 + 3 + 3 + 5 = 21
      { service_id: 'b', day: day(30), orders: 4 },                                         // 20 / 2 = 10
      { service_id: 'c', day: day(91), orders: 100 },                                       // out of the window
      { service_id: 'd', day: day(0) },                                                      // no signal
    ], NOW, {});
    expect(s.get('a')).toBe(21);
    expect(s.get('b')).toBe(10);
    expect(s.has('c')).toBe(false);
    expect(s.has('d')).toBe(false);
    const sum = scoreServices([{ service_id: 'a', day: day(0), views: 1 }, { service_id: 'a', day: day(30), views: 2 }], NOW, {});
    expect(sum.get('a')).toBe(2);
  });

  it('the weights can be set by the environment', () => {
    expect(scoreServices([{ service_id: 'a', day: day(0), orders: 1 }], NOW, { CATALOGUE_RANK_W_ORDER: '10' } as never).get('a')).toBe(10);
  });

  it('smart_ranking is the default sort; popularity keeps the old order; anything else falls back (never an error)', () => {
    expect(normalizeCatalogueSort(undefined)).toBe('smart_ranking');
    expect(normalizeCatalogueSort('nonsense')).toBe('smart_ranking');
    expect(catalogueSortSpec(undefined)).toEqual({ rank_score: -1, popularity: -1, name_ar: 1 });
    expect(catalogueSortSpec('popularity')).toEqual({ popularity: -1, name_ar: 1 });
  });
});

describe('events and the recompute (real MongoDB)', () => {
  let mongo: MongoMemoryServer;
  let service: CatalogueRankingService;
  const mem = new Map<string, string>();
  const redis: any = { exists: async (k: string) => mem.has(k), set: async (k: string, v: string) => { mem.set(k, v); } };
  const col = (n: string) => mongoose.connection.collection(n);
  const ctx = { ip: '203.0.113.9', userAgent: BROWSER, sessionId: 's1' };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'cat_rank' });
    service = new CatalogueRankingService(mongoose.connection as never, redis);
  });
  afterAll(async () => { await mongoose.disconnect(); await mongo.stop(); });
  beforeEach(async () => {
    mem.clear();
    for (const c of ['lab_services', 'radiology_services', 'nursing_services', DAILY_COLLECTION, 'labbookings', 'radiologybookings', 'homecarebookings']) await col(c).deleteMany({});
    await col('lab_services').insertMany([{ id: 'lab-aaaa-1111', name_ar: 'أ', popularity: 10 }, { id: 'lab-bbbb-2222', name_ar: 'ب', popularity: 90 }, { id: 'lab-gone-3333', is_deleted: true }] as never);
    await col('radiology_services').insertMany([{ id: 'rad-aaaa-1111', popularity: 5 }] as never);
    await col('nursing_services').insertMany([{ id: 'nur-aaaa-1111', popularity: 5 }] as never);
  });

  it('counts a view once per visitor, not a bot, not an unknown or a removed service; stores only counters', async () => {
    expect(await service.recordClientSignal('lab', 'lab-aaaa-1111', 'view', ctx)).toEqual({ counted: true });
    expect(await service.recordClientSignal('lab', 'lab-aaaa-1111', 'view', ctx)).toEqual({ counted: false, reason: 'duplicate' });
    expect(await service.recordClientSignal('lab', 'lab-aaaa-1111', 'view', { ...ctx, userAgent: 'Googlebot/2.1' })).toEqual({ counted: false, reason: 'bot' });
    expect(await service.recordClientSignal('lab', 'lab-zzzz-9999', 'view', ctx)).toEqual({ counted: false, reason: 'unknown_service' });
    expect(await service.recordClientSignal('lab', 'lab-gone-3333', 'view', ctx)).toEqual({ counted: false, reason: 'unknown_service' });
    expect(await service.recordClientSignal('lab', 'bad id!', 'view', ctx)).toEqual({ counted: false, reason: 'invalid' });
    expect(await service.recordClientSignal('lab', 'lab-aaaa-1111', 'view', { ...ctx, sessionId: 's2', ip: '198.51.100.4' })).toEqual({ counted: true });
    const docs = await col(DAILY_COLLECTION).find({}).toArray();
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ vertical: 'lab', service_id: 'lab-aaaa-1111', day: dayKey(new Date()), views: 2 });
    expect(Object.keys(docs[0]).sort()).toEqual(['_id', 'day', 'service_id', 'vertical', 'views']);      // no user, session, address or agent
    expect(JSON.stringify([...mem.keys()])).not.toContain('203.0.113.9');                                 // the redis key holds a hash, not the address
  });

  it('a cart add is counted by the server and never fails the cart', async () => {
    await service.recordCartAdd('radiology', 'rad-aaaa-1111');
    await service.recordCartAdd('nursing', 'nur-aaaa-1111');
    await service.recordCartAdd('lab', 'not valid');                                                       // ignored, no throw
    expect((await col(DAILY_COLLECTION).find({}).toArray()).map((d) => [d.vertical, d.cart_adds]).sort()).toEqual([['nursing', 1], ['radiology', 1]]);
  });

  it('recompute: orders from the bookings plus counters give rank_score; the second run changes nothing; the dry run writes nothing; old counters are dropped', async () => {
    const created = (back: number) => new Date(NOW.getTime() - back * 86_400_000);
    await col(DAILY_COLLECTION).insertMany([
      { vertical: 'lab', service_id: 'lab-aaaa-1111', day: day(0), views: 4 },
      { vertical: 'lab', service_id: 'lab-aaaa-1111', day: day(200), views: 1000 },
    ] as never);
    await col('labbookings').insertMany([
      { createdAt: created(0), state: 'COMPLETED', items: [{ service_id: 'lab-bbbb-2222' }, { service_id: 'lab-aaaa-1111' }] },
      { createdAt: created(1), state: 'CANCELLED', items: [{ service_id: 'lab-bbbb-2222' }] },                       // not an order
    ] as never);
    await col('radiologybookings').insertOne({ createdAt: created(0), status: 'confirmed', items: [{ service_id: 'rad-aaaa-1111' }] } as never);
    await col('homecarebookings').insertMany([{ createdAt: created(0), state: 'NEW_REQUEST', service_id: 'nur-aaaa-1111' }, { createdAt: created(0), state: 'CANCELLED', service_id: 'nur-aaaa-1111' }] as never);

    const dry = await service.recompute(false, NOW);
    expect(await col('lab_services').countDocuments({ rank_score: { $exists: true } })).toBe(0);
    expect(dry.find((d) => d.vertical === 'lab')).toMatchObject({ rows: 3, with_signals: 2, changed: 3, orders_counted: 2 });

    const first = await service.recompute(true, NOW);
    expect(first.find((d) => d.vertical === 'lab')!.changed).toBe(3);
    const score = async (c: string, id: string) => (await col(c).findOne({ id }))!.rank_score;
    expect(await score('lab_services', 'lab-aaaa-1111')).toBeGreaterThan(0);        // 4 views + 1 order
    expect(await score('lab_services', 'lab-bbbb-2222')).toBe(5);                    // 1 order (the cancelled one does not count)
    expect(await score('lab_services', 'lab-gone-3333')).toBe(0);
    expect(await score('radiology_services', 'rad-aaaa-1111')).toBe(5);
    expect(await score('nursing_services', 'nur-aaaa-1111')).toBe(5);                // the cancelled visit does not count
    expect(await col(DAILY_COLLECTION).countDocuments({ day: day(200) })).toBe(0);   // outside the window: dropped
    const second = await service.recompute(true, NOW);
    expect(second.every((d) => d.changed === 0)).toBe(true);
  });
});

describe('the public events endpoint', () => {
  const make = () => {
    const ranking: any = { recordClientSignal: jest.fn().mockResolvedValue({ counted: true }) };
    return { ctrl: new CatalogueRankingController(ranking), ranking };
  };
  const req: any = { ip: '10.0.0.1', headers: { 'user-agent': BROWSER }, socket: {} };

  it('takes a view and a search result, and refuses what only the server may count', async () => {
    const { ctrl, ranking } = make();
    await expect(ctrl.event({ vertical: 'lab', service_id: 'lab-aaaa-1111', event: 'view' }, req)).resolves.toMatchObject({ status: 'success', counted: true });
    expect(ranking.recordClientSignal).toHaveBeenCalledWith('lab', 'lab-aaaa-1111', 'view', expect.objectContaining({ userAgent: BROWSER }));
    for (const event of ['cart_add', 'order']) await expect(ctrl.event({ vertical: 'lab', service_id: 'lab-aaaa-1111', event }, req)).rejects.toThrow(BadRequestException);
    expect(ranking.recordClientSignal).toHaveBeenCalledTimes(1);
  });
});
