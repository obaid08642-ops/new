import { ProductRankingService } from './product-ranking.service';

// P13-R9: the ranking service exposes every spec mode (trending, most viewed,
// most searched, most added to cart, best selling, highest conversion,
// popular recently, smart) with pharmacy vs global and category scope.
// Red on the base: only smart_ranking/trending/most_viewed/bestseller exist —
// most_searched, most_added_to_cart, highest_conversion and popular_recently
// all fall through to the composite sort, so each mode returns the composite
// order instead of its own signal.
describe('P13-R9 ranking modes', () => {
  const DAY = 86400000;
  const now = Date.now();
  const old = new Date(now - 60 * DAY);
  const recent = new Date(now - 3600000);
  const stale = new Date(now - 30 * DAY);

  // Same category/scope; divergent signals. Stored scores mirror the service
  // formulas (composite 30d half-life, trending 7d, recent 24h, no cold start:
  // published 60d ago). Composite ranks D first (1512); each new mode must
  // rank its own winner first.
  const seed = [
    { drug_id: 'A', pharmacy_id: 'global', category: 'vitamins', views_count: 1000, searches_count: 100, clicks_count: 0, cart_adds_count: 1, purchases_count: 0, wishlist_adds_count: 0, conversion_rate: 0, composite_score: 1153, trending_score: 1153, recent_score: 1153, availability_status: 'in_stock', last_event_at: recent, first_published_at: old },
    { drug_id: 'B', pharmacy_id: 'global', category: 'vitamins', views_count: 100, searches_count: 200, clicks_count: 0, cart_adds_count: 50, purchases_count: 40, wishlist_adds_count: 0, conversion_rate: 0.4, composite_score: 750, trending_score: 750, recent_score: 750, availability_status: 'in_stock', last_event_at: recent, first_published_at: old },
    { drug_id: 'C', pharmacy_id: 'global', category: 'vitamins', views_count: 10, searches_count: 1, clicks_count: 0, cart_adds_count: 2, purchases_count: 1, wishlist_adds_count: 0, conversion_rate: 0.1, composite_score: 28.5, trending_score: 28.5, recent_score: 28.5, availability_status: 'in_stock', last_event_at: recent, first_published_at: old },
    { drug_id: 'D', pharmacy_id: 'global', category: 'vitamins', views_count: 3000, searches_count: 10, clicks_count: 0, cart_adds_count: 3, purchases_count: 0, wishlist_adds_count: 0, conversion_rate: 0, composite_score: 1512, trending_score: 156, recent_score: 0, availability_status: 'in_stock', last_event_at: stale, first_published_at: old },
  ];

  function serviceWith(rows: any[] = seed) {
    const db = new Map(rows.map((r) => [`${r.drug_id}:${r.pharmacy_id}`, { ...r }]));
    const zadds: Array<{ key: string; score: number; member: string }> = [];
    const zsets = new Map<string, Array<{ score: number; member: string }>>();
    const redis: any = {
      zadd: jest.fn(async (key: string, score: number, member: string) => {
        zadds.push({ key, score, member });
        const arr = zsets.get(key) || [];
        arr.push({ score, member });
        zsets.set(key, arr);
        return 1;
      }),
      zcard: jest.fn(async () => 0),
      zrevrange: jest.fn(async () => []),
      zscore: jest.fn(async () => null),
    };
    const metricsModel: any = function (data: any) {
      Object.assign(this, { views_count: 0, searches_count: 0, clicks_count: 0, cart_adds_count: 0, purchases_count: 0, wishlist_adds_count: 0, conversion_rate: 0, composite_score: 0, trending_score: 0, recent_score: 0, ...data });
      this.save = async () => { db.set(`${this.drug_id}:${this.pharmacy_id}`, { ...this }); return this; };
    };
    metricsModel.findOne = jest.fn((q: any) => {
      const scalar = (v: any) => (v && typeof v === 'object' && '$eq' in v ? v.$eq : v);
      const found = db.get(`${scalar(q.drug_id)}:${scalar(q.pharmacy_id)}`) || null;
      return { exec: async () => found, then: (r: any) => Promise.resolve(found).then(r) };
    });
    metricsModel.find = jest.fn((q: any) => {
      const scalar = (v: any) => (v && typeof v === 'object' && '$eq' in v ? v.$eq : v);
      const rows = Array.from(db.values()).filter((r: any) => {
        if (q.pharmacy_id && r.pharmacy_id !== scalar(q.pharmacy_id)) return false;
        if (q.category && r.category !== scalar(q.category)) return false;
        return true;
      });
      return {
        sort: (s: any) => ({
          skip: (sk: number) => ({
            limit: (l: number) => ({
              exec: async () => {
                const k = Object.keys(s)[0];
                const dir = s[k];
                return [...rows].sort((a, b) => (a[k] - b[k]) * dir).slice(sk, sk + l);
              },
            }),
          }),
        }),
        exec: async () => rows,
      };
    });
    metricsModel.countDocuments = jest.fn(() => ({ exec: async () => db.size }));
    const svc = new ProductRankingService(metricsModel, redis, undefined);
    return { svc, redis, zadds, db };
  }

  const scopeOf = (sort: any) => ({ pharmacyId: 'global', category: 'vitamins', sort, limit: 10 });

  it('most_searched ranks by searches, not composite', async () => {
    const { svc } = serviceWith();
    const out = await svc.getRankedDrugIds(scopeOf('most_searched'));
    expect(out.drugIds[0]).toBe('B');
  });

  it('most_added_to_cart ranks by cart adds, not composite', async () => {
    const { svc } = serviceWith();
    const out = await svc.getRankedDrugIds(scopeOf('most_added_to_cart'));
    expect(out.drugIds[0]).toBe('B');
  });

  it('highest_conversion ranks by conversion rate, not composite', async () => {
    const { svc } = serviceWith();
    const out = await svc.getRankedDrugIds(scopeOf('highest_conversion'));
    expect(out.drugIds[0]).toBe('B');
  });

  it('popular_recently ranks recent activity above stale volume', async () => {
    const { svc } = serviceWith();
    const out = await svc.getRankedDrugIds(scopeOf('popular_recently'));
    expect(out.drugIds[0]).toBe('A');
    expect(out.drugIds[out.drugIds.length - 1]).toBe('D');
  });

  it('smart_ranking still ranks composite first (D, stale volume wins all-time)', async () => {
    const { svc } = serviceWith();
    const out = await svc.getRankedDrugIds(scopeOf('smart_ranking'));
    expect(out.drugIds[0]).toBe('D');
  });

  it('an unknown sort falls back to smart_ranking', async () => {
    const { svc } = serviceWith();
    const smart = await svc.getRankedDrugIds(scopeOf('smart_ranking'));
    const bogus = await svc.getRankedDrugIds(scopeOf('bogus' as any));
    expect(bogus.drugIds).toEqual(smart.drugIds);
  });

  it('updateScores maintains one ZSet family per mode', async () => {
    const { svc, zadds } = serviceWith([]);
    await svc.updateScores('drug-x', 'global', 'vitamins');
    const keys = zadds.map((z) => z.key);
    for (const fam of ['rank:popular', 'rank:trending', 'rank:searched', 'rank:cart', 'rank:conversion', 'rank:recent']) {
      expect(keys.some((k) => k.startsWith(`${fam}:global`))).toBe(true);
    }
  });
});
