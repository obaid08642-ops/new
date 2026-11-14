import { ProductRankingService } from './product-ranking.service';
import { ProductRankingEventService } from './product-ranking-event.service';
import { RedisService } from '../redis/redis.service';

describe('Continuous Dynamic Product Ranking Engine (Part 1 & 2)', () => {
  let redisService: RedisService;
  let rankingService: ProductRankingService;
  let eventService: ProductRankingEventService;

  // In-memory mock Mongoose model for isolated, deterministic execution.
  // Unwraps scalar equality ({ $eq: v }) exactly like Mongo matches it.
  const mockDatabase = new Map<string, any>();
  const scalar = (v: any) => (v && typeof v === 'object' && '$eq' in v ? v.$eq : v);

  const mockModel: any = function (data: any) {
    Object.assign(this, data);
    this.save = async () => {
      mockDatabase.set(`${this.drug_id}:${this.pharmacy_id}`, { ...this });
      return this;
    };
  };
  mockModel.findOne = jest.fn((query: any) => ({
    exec: async () => mockDatabase.get(`${scalar(query.drug_id)}:${scalar(query.pharmacy_id)}`) || null,
    then: (resolve: any) => Promise.resolve(mockDatabase.get(`${scalar(query.drug_id)}:${scalar(query.pharmacy_id)}`) || null).then(resolve),
  }));
  mockModel.find = jest.fn((query: any) => ({
    sort: (sortObj: any) => ({
      skip: (skipVal: number) => ({
        limit: (limitVal: number) => ({
          exec: async () => {
            const all = Array.from(mockDatabase.values()).filter((item) => {
              if (query.pharmacy_id && item.pharmacy_id !== query.pharmacy_id) return false;
              if (query.category && item.category !== query.category) return false;
              return true;
            });
            const sortKey = Object.keys(sortObj)[0];
            const sortDir = sortObj[sortKey];
            all.sort((a, b) => (b[sortKey] - a[sortKey]) * sortDir);
            return all.slice(skipVal, skipVal + limitVal);
          },
        }),
      }),
    }),
  }));
  mockModel.countDocuments = jest.fn((query: any) => ({
    exec: async () => {
      return Array.from(mockDatabase.values()).filter((item) => {
        if (query.pharmacy_id && item.pharmacy_id !== query.pharmacy_id) return false;
        if (query.category && item.category !== query.category) return false;
        return true;
      }).length;
    },
  }));
  mockModel.findOneAndUpdate = jest.fn(async (filter: any, update: any, options: any) => {
    const key = `${scalar(filter.drug_id)}:${scalar(filter.pharmacy_id)}`;
    let existing = mockDatabase.get(key);
    if (!existing && options?.upsert) {
      existing = {
        drug_id: scalar(filter.drug_id),
        pharmacy_id: scalar(filter.pharmacy_id),
        views_count: 0,
        searches_count: 0,
        clicks_count: 0,
        cart_adds_count: 0,
        purchases_count: 0,
        wishlist_adds_count: 0,
        ...update.$setOnInsert,
      };
    }
    if (update.$inc) {
      for (const [f, v] of Object.entries(update.$inc)) {
        existing[f] = (existing[f] || 0) + (v as number);
      }
    }
    if (update.$set) {
      Object.assign(existing, update.$set);
    }
    if (existing && !existing.save) {
      existing.save = async function () {
        mockDatabase.set(key, this);
        return this;
      };
    }
    mockDatabase.set(key, existing);
    return existing;
  });

  beforeEach(() => {
    mockDatabase.clear();
    redisService = new RedisService(); // uses in-memory fallback by default
    rankingService = new ProductRankingService(mockModel as any, redisService);
    eventService = new ProductRankingEventService(mockModel as any, rankingService, redisService);
  });

  describe('1. Mathematical Scoring & Multi-Dimensional Weights', () => {
    it('calculates expected raw weights for all event dimensions', () => {
      const now = new Date();
      const pastPublish = new Date(now.getTime() - 10 * 24 * 3600 * 1000); // 10 days old, no cold start
      const metrics = {
        views_count: 10,       // 10 * 1.0 = 10
        searches_count: 4,     // 4 * 1.5 = 6
        clicks_count: 2,       // 2 * 1.5 = 3
        cart_adds_count: 2,    // 2 * 3.0 = 6
        purchases_count: 1,    // 1 * 5.0 = 5
        wishlist_adds_count: 1,// 1 * 2.0 = 2
        // conversion = 1 / 10 = 0.1 * 10 = 1.0 boost
        availability_status: 'in_stock',
        last_event_at: now,
        first_published_at: pastPublish,
      };

      const { compositeScore } = rankingService.calculateCompositeScore(metrics);
      // Raw: 10 + 6 + 3 + 6 + 5 + 2 + 1 = 33
      expect(compositeScore).toBeCloseTo(33, 0);
    });

    it('penalizes out-of-stock items to 0 score', () => {
      const metrics = {
        views_count: 50,
        purchases_count: 20,
        availability_status: 'out_of_stock',
      };
      const { compositeScore } = rankingService.calculateCompositeScore(metrics);
      expect(compositeScore).toBe(0);
    });

    it('applies 80% discount to low-stock items (0.2 availability factor)', () => {
      const now = new Date();
      const pastPublish = new Date(now.getTime() - 10 * 24 * 3600 * 1000);
      const metrics = {
        purchases_count: 10, // 10 * 5 = 50
        availability_status: 'low_stock',
        last_event_at: now,
        first_published_at: pastPublish,
      };
      const { compositeScore } = rankingService.calculateCompositeScore(metrics);
      // 50 * 0.2 = 10
      expect(compositeScore).toBeCloseTo(10, 0);
    });

    it('grants cold start exploration bonus to new products (< 7 days)', () => {
      const now = new Date();
      const newProduct = {
        views_count: 0,
        purchases_count: 0,
        availability_status: 'in_stock',
        last_event_at: now,
        first_published_at: now, // brand new today
      };
      const { compositeScore } = rankingService.calculateCompositeScore(newProduct);
      expect(compositeScore).toBeGreaterThan(0);
      expect(compositeScore).toBeCloseTo(15, 0);
    });
  });

  describe('2. Continuous Dynamic Re-Ranking Simulation (Requirement #3 & #4)', () => {
    it('dynamically promotes Product B over Product A when B gains engagement', async () => {
      // Step 1: Initial state
      // Product A has 10 views (score ~ 10)
      // Product B has 2 views (score ~ 2)
      await eventService.recordEvent({
        eventType: 'product_viewed',
        drugId: 'prod-A',
        category: 'medicines',
        userId: 'user-1',
      });
      await eventService.recordEvent({
        eventType: 'product_viewed',
        drugId: 'prod-B',
        category: 'cosmetics',
        userId: 'user-1',
      });

      // Directly adjust counts for initial testing baseline
      const recA = mockDatabase.get('prod-A:global');
      recA.views_count = 10;
      recA.first_published_at = new Date(Date.now() - 15 * 86400000);
      await rankingService.updateScores('prod-A', 'global', 'medicines');

      const recB = mockDatabase.get('prod-B:global');
      recB.views_count = 2;
      recB.first_published_at = new Date(Date.now() - 15 * 86400000);
      await rankingService.updateScores('prod-B', 'global', 'cosmetics');

      // Check initial ranking: prod-A must be #1, prod-B must be #2
      let ranked = await rankingService.getRankedDrugIds({});
      expect(ranked.drugIds[0]).toBe('prod-A');
      expect(ranked.drugIds[1]).toBe('prod-B');

      // Step 2: Live Events arrive for Product B
      // B gets 2 purchases (2 * 5 = 10) + 1 cart add (3) + 1 wishlist (2)
      await eventService.recordEvent({
        eventType: 'purchase_completed',
        drugId: 'prod-B',
        category: 'cosmetics',
        quantity: 2,
      });
      await eventService.recordEvent({
        eventType: 'product_added_to_cart',
        drugId: 'prod-B',
        category: 'cosmetics',
      });
      await eventService.recordEvent({
        eventType: 'wishlist_added',
        drugId: 'prod-B',
        category: 'cosmetics',
      });

      // Step 3: Verify B has now dynamically overtaken A in real time without any cron or restart!
      ranked = await rankingService.getRankedDrugIds({});
      expect(ranked.drugIds[0]).toBe('prod-B');
      expect(ranked.drugIds[1]).toBe('prod-A');

      // Step 4: Product C enters with 6 purchases -> C dynamically overtakes both to become #1! (no cold start boost: it counts only for products a provider or admin created)
      await eventService.recordEvent({
        eventType: 'purchase_completed',
        drugId: 'prod-C',
        category: 'baby_products',
        quantity: 6, // 6 * 5 = 30, more than B's 27
      });

      ranked = await rankingService.getRankedDrugIds({});
      expect(ranked.drugIds[0]).toBe('prod-C');
      expect(ranked.drugIds[1]).toBe('prod-B');
      expect(ranked.drugIds[2]).toBe('prod-A');
    });
  });

  describe('3. Default View (ALL Categories) vs Category-Specific View (Req #1 & #2)', () => {
    it('ranks all eligible categories together in default view without forcing quotas', async () => {
      // Insert items across 3 different categories
      const past = new Date(Date.now() - 15 * 86400000);
      mockDatabase.set('med-1:global', { drug_id: 'med-1', pharmacy_id: 'global', category: 'medicines', purchases_count: 10, views_count: 20, first_published_at: past, last_event_at: new Date() });
      mockDatabase.set('med-2:global', { drug_id: 'med-2', pharmacy_id: 'global', category: 'medicines', purchases_count: 8, views_count: 15, first_published_at: past, last_event_at: new Date() });
      mockDatabase.set('cos-1:global', { drug_id: 'cos-1', pharmacy_id: 'global', category: 'cosmetics', purchases_count: 12, views_count: 25, first_published_at: past, last_event_at: new Date() });
      mockDatabase.set('baby-1:global', { drug_id: 'baby-1', pharmacy_id: 'global', category: 'baby_products', purchases_count: 2, views_count: 5, first_published_at: past, last_event_at: new Date() });

      await rankingService.updateScores('med-1', 'global', 'medicines');
      await rankingService.updateScores('med-2', 'global', 'medicines');
      await rankingService.updateScores('cos-1', 'global', 'cosmetics');
      await rankingService.updateScores('baby-1', 'global', 'baby_products');

      // Default scope (ALL CATEGORIES): cos-1 (#1) -> med-1 (#2) -> med-2 (#3) -> baby-1 (#4)
      // Note: cos-1 and med-1 and med-2 appear naturally by score; NO artificial 1-per-category restriction!
      const defaultView = await rankingService.getRankedDrugIds({});
      expect(defaultView.drugIds).toEqual(['cos-1', 'med-1', 'med-2', 'baby-1']);

      // Category-Specific scope (Cosmetics only)
      const cosmeticsView = await rankingService.getRankedDrugIds({ category: 'cosmetics' });
      expect(cosmeticsView.drugIds).toEqual(['cos-1']);

      // Category-Specific scope (Medicines only)
      const medicinesView = await rankingService.getRankedDrugIds({ category: 'medicines' });
      expect(medicinesView.drugIds).toEqual(['med-1', 'med-2']);
    });
  });

  describe('4. Event Deduplication & Anti-Gaming (Req #11)', () => {
    it('suppresses duplicate views from the same user/session within time window', async () => {
      const r1 = await eventService.recordEvent({
        eventType: 'product_viewed',
        drugId: 'prod-X',
        userId: 'spammer-1',
      });
      expect(r1.counted).toBe(true);

      // Immediate second view from same user must NOT be counted
      const r2 = await eventService.recordEvent({
        eventType: 'product_viewed',
        drugId: 'prod-X',
        userId: 'spammer-1',
      });
      expect(r2.counted).toBe(false);

      // But a purchase from that same user is transaction-based and MUST be counted
      const r3 = await eventService.recordEvent({
        eventType: 'purchase_completed',
        drugId: 'prod-X',
        userId: 'spammer-1',
      });
      expect(r3.counted).toBe(true);
    });
  });
});

describe('cold start boost belongs to products a provider or admin created', () => {
  const svc = (medicine: any) => {
    const conn: any = { collection: () => ({ findOne: async () => medicine, updateOne: async () => ({}) }) };
    return new ProductRankingService({} as any, {} as any, conn);
  };
  const recent = new Date(Date.now() - 2 * 86400000);

  it('the imported catalogue never gets it', async () => {
    expect((await svc({ source: 'bulk_import', createdAt: recent }).coldStartPublishedAt('m')).getTime()).toBe(0);
    expect((await svc({ source: 'master', createdAt: recent }).coldStartPublishedAt('m')).getTime()).toBe(0);
    expect((await svc({ source: 'admin', source_product_id: 17, createdAt: recent }).coldStartPublishedAt('m')).getTime()).toBe(0);
    expect((await svc(null).coldStartPublishedAt('m')).getTime()).toBe(0);
  });

  it('a product an admin or a pharmacy created recently gets it, from its creation date', async () => {
    expect((await svc({ source: 'admin', createdAt: recent }).coldStartPublishedAt('m')).getTime()).toBe(recent.getTime());
    expect((await svc({ source: 'pharmacy', createdAt: recent }).coldStartPublishedAt('m')).getTime()).toBe(recent.getTime());
  });

  it('a score with no publication date has no boost, and a view of a never-seen product is worth one point', () => {
    const s = svc(null);
    expect(s.calculateCompositeScore({ availability_status: 'in_stock' }).compositeScore).toBe(0);
    expect(s.calculateCompositeScore({ views_count: 1, availability_status: 'in_stock', last_event_at: new Date(), first_published_at: new Date(0) }).compositeScore).toBeCloseTo(1, 0);
  });
});

describe('the score job gives a new provider or admin product its boost before its first event', () => {
  it('seeds the boost for a new admin product, never for the imported catalogue, and zeroes a stale score', async () => {
    const day = 86400000;
    const created = new Date(Date.now() - 1 * day);
    const updates: Array<{ id: string; score: number }> = [];
    const medicines = {
      find: jest.fn((filter: any) => ({
        toArray: async () => (filter.rank_score
          ? [{ id: 'old-one' }, { id: 'seeded-now' }]
          : [{ id: 'seeded-now', createdAt: created, availability_status: 'in_stock' }, { id: 'out-of-stock', createdAt: created, availability_status: 'out_of_stock' }]),
      })),
      updateOne: jest.fn(async (q: any, u: any) => { updates.push({ id: q.id.$eq, score: u.$set.rank_score }); return {}; }),
    };
    const metricsModel: any = {
      find: jest.fn(() => ({ cursor: () => (async function* () { /* no metrics rows */ })(), select: () => ({ lean: () => ({ exec: async () => [] }) }) })),
    };
    const svc = new ProductRankingService(metricsModel, {} as any, { collection: () => medicines } as any);
    await svc.recomputeAll();
    const seeded = updates.find((u) => u.id === 'seeded-now' && u.score > 0);
    expect(seeded?.score).toBeGreaterThan(10); // 15 * (1 - 1/7) = 12.86
    expect(updates.find((u) => u.id === 'out-of-stock')?.score).toBe(0); // out of stock: availability multiplier 0
    expect(updates.find((u) => u.id === 'old-one')?.score).toBe(0); // no longer new, no signals
    // the query only ever selects what a provider or an admin created, never the imported catalogue
    const q = medicines.find.mock.calls.find((c: any[]) => c[0].createdAt)![0];
    expect(q.source.$in).toEqual(['admin', 'pharmacy', 'provider']);
    expect(q.source_product_id).toEqual({ $exists: false });
  });
});
