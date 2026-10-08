import { AnalyticsEventService } from './analytics-event.service';
import { AnalyticsSink } from './analytics-sink';

type Doc = Record<string, unknown>;

function makeConn() {
  const store: Doc[] = [];
  const matches = (doc: Doc, filter: Record<string, unknown>): boolean => {
    for (const [k, cond] of Object.entries(filter)) {
      const c = cond as Doc;
      if (c !== null && typeof c === 'object' && '$eq' in c) {
        if (doc[k] !== c['$eq']) return false;
      } else if (doc[k] !== (cond as unknown)) return false;
    }
    return true;
  };
  const collection = () => ({
    findOne: async (f: Record<string, unknown>): Promise<Doc | null> =>
      store.find((d) => matches(d, f)) ?? null,
    insertOne: async (d: Doc): Promise<{ insertedId: unknown }> => {
      store.push(d);
      return { insertedId: d['id'] };
    },
    find: (f: Record<string, unknown>) => ({
      toArray: async (): Promise<Doc[]> => store.filter((d) => matches(d, f)),
      limit: (n: number) => ({ toArray: async (): Promise<Doc[]> => store.filter((d) => matches(d, f)).slice(0, n) }),
    }),
    countDocuments: async (f: Record<string, unknown>): Promise<number> =>
      store.filter((d) => matches(d, f)).length,
  });
  const conn = { collection: (_name: string) => collection() };
  return { store, conn };
}

const evt = (i: number, extra?: Record<string, unknown>) => ({
  eventType: 'search',
  domain: 'pharmacy',
  idempotencyKey: `idem-seed-${i}`,
  ...(extra || {}),
});

describe('P22.10 analytics event pipeline (mocked store)', () => {
  it('consent gate: drops identified events without consent, never persists', async () => {
    const { store, conn } = makeConn();
    const svc = new AnalyticsEventService(conn as unknown as import('mongoose').Connection);
    const res = await svc.ingest({ ...evt(1), userId: 'u-no-consent' });
    expect(res).toEqual({ ok: false, reason: 'consent_required' });
    expect(store.length).toBe(0);
  });

  it('ingest with consent persists; idempotent on key; strips network identifiers', async () => {
    const { store, conn } = makeConn();
    const svc = new AnalyticsEventService(conn as unknown as import('mongoose').Connection);
    svc.setConsentResolver(async () => ({ analytics: 'granted', personalized: 'denied' }));
    const first = await svc.ingest({
      ...evt(2),
      userId: 'u-ok',
      metadata: { query: 'panadol', ip_address: '1.2.3.4', user_agent: 'ua', ip: '9.9.9.9' },
    });
    expect(first).toEqual({ ok: true });
    const dup = await svc.ingest({
      ...evt(2),
      userId: 'u-ok',
      metadata: { query: 'panadol' },
    });
    expect(dup).toEqual({ ok: true, duplicate: true });
    expect(store.length).toBe(1);
    const meta = store[0]['metadata'] as Doc;
    expect(meta['query']).toBe('panadol');
    expect(meta['ip_address']).toBeUndefined();
    expect(meta['user_agent']).toBeUndefined();
    expect(meta['ip']).toBeUndefined();
  });

  it('anonymous events need no consent', async () => {
    const { store, conn } = makeConn();
    const svc = new AnalyticsEventService(conn as unknown as import('mongoose').Connection);
    const res = await svc.ingest(evt(3));
    expect(res).toEqual({ ok: true });
    expect(store.length).toBe(1);
  });

  it('rejects unknown event types', async () => {
    const { conn } = makeConn();
    const svc = new AnalyticsEventService(conn as unknown as import('mongoose').Connection);
    await expect(svc.ingest({ ...evt(4), eventType: 'bogus' })).rejects.toThrow('unknown_event_type');
  });

  it('funnel computes ordered counts + step conversion on seeded events', async () => {
    const { conn } = makeConn();
    const svc = new AnalyticsEventService(conn as unknown as import('mongoose').Connection);
    svc.setConsentResolver(async () => ({ analytics: 'granted', personalized: 'denied' }));
    for (let i = 0; i < 100; i++) await svc.ingest({ ...evt(100 + i, { eventType: 'search' }) });
    for (let i = 0; i < 40; i++) await svc.ingest({ ...evt(200 + i, { eventType: 'click' }) });
    for (let i = 0; i < 10; i++) await svc.ingest({ ...evt(300 + i, { eventType: 'booking_attempt' }) });
    const out = await svc.funnel('search,click,booking_attempt', 'pharmacy');
    expect(out.steps.map((s) => s.count)).toEqual([100, 40, 10]);
    expect(out.steps[1].conversionFromPreviousPct).toBe(40);
    expect(out.steps[2].conversionFromPreviousPct).toBe(25);
    expect(out.steps[0].conversionFromPreviousPct).toBeNull();
  });

  it('retention cohorts computed from seeded events', async () => {
    const { store, conn } = makeConn();
    const svc = new AnalyticsEventService(conn as unknown as import('mongoose').Connection);
    const monday = new Date('2026-09-07T10:00:00Z');
    const tuesday = new Date('2026-09-08T10:00:00Z');
    for (let i = 0; i < 4; i++) {
      store.push({
        id: `seed-${i}`,
        event_type: 'search',
        domain: 'pharmacy',
        user_id: `coh-u-${i}`,
        createdAt: monday,
      });
    }
    store.push({ id: 'seed-r1', event_type: 'click', domain: 'pharmacy', user_id: 'coh-u-0', createdAt: tuesday });
    store.push({ id: 'seed-r2', event_type: 'click', domain: 'pharmacy', user_id: 'coh-u-1', createdAt: tuesday });
    const out = await svc.retentionCohorts('pharmacy');
    expect(out.cohorts.length).toBe(1);
    expect(out.cohorts[0].size).toBe(4);
    expect(out.cohorts[0].d1Pct).toBe(50);
  });

  it('report queries target the sink abstraction, not the production DB', async () => {
    const { conn } = makeConn();
    const svc = new AnalyticsEventService(conn as unknown as import('mongoose').Connection);
    const sink: AnalyticsSink = svc.getSink();
    expect(sink.name).toBe('mongo-analytics-sink');
    const countSpy = jest.spyOn(sink, 'count');
    const findSpy = jest.spyOn(sink, 'find');
    await svc.funnel('search,click');
    expect(countSpy).toHaveBeenCalled();
    await svc.retentionCohorts();
    expect(findSpy).toHaveBeenCalled();
    expect(countSpy.mock.calls[0][0]).toBe('analytics_events');
    expect(findSpy.mock.calls[0][0]).toBe('analytics_events');
  });
});
