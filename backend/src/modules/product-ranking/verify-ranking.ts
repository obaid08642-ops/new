import test from 'node:test';
import assert from 'node:assert/strict';
import { ProductRankingService } from './product-ranking.service.ts';
import { ProductRankingEventService } from './product-ranking-event.service.ts';
import { RedisService } from '../redis/redis.service.ts';

test('Product Ranking Engine — Part 1 & Part 2 Verification', async (t) => {
  const mockDatabase = new Map<string, any>();

  const mockModel: any = function (data: any) {
    Object.assign(this, data);
    this.save = async () => {
      mockDatabase.set(`${this.drug_id}:${this.pharmacy_id}`, { ...this });
      return this;
    };
  };

  mockModel.findOne = (query: any) => ({
    exec: async () => mockDatabase.get(`${query.drug_id}:${query.pharmacy_id}`) || null,
    then: (resolve: any) => Promise.resolve(mockDatabase.get(`${query.drug_id}:${query.pharmacy_id}`) || null).then(resolve),
  });

  mockModel.find = (query: any) => ({
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
  });

  mockModel.countDocuments = (query: any) => ({
    exec: async () => {
      return Array.from(mockDatabase.values()).filter((item) => {
        if (query.pharmacy_id && item.pharmacy_id !== query.pharmacy_id) return false;
        if (query.category && item.category !== query.category) return false;
        return true;
      }).length;
    },
  });

  mockModel.findOneAndUpdate = async (filter: any, update: any, options: any) => {
    const key = `${filter.drug_id}:${filter.pharmacy_id}`;
    let existing = mockDatabase.get(key);
    if (!existing && options?.upsert) {
      existing = {
        drug_id: filter.drug_id,
        pharmacy_id: filter.pharmacy_id,
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
    mockDatabase.set(key, existing);
    return existing;
  };

  const redisService = new RedisService();
  const rankingService = new ProductRankingService(mockModel as any, redisService);
  const eventService = new ProductRankingEventService(mockModel as any, rankingService, redisService);

  await t.test('1. Multi-Dimensional Scoring Formula & Weights', () => {
    const now = new Date();
    const pastPublish = new Date(now.getTime() - 15 * 86400000);
    const metrics = {
      views_count: 10,       // 10 * 1 = 10
      searches_count: 4,     // 4 * 1.5 = 6
      clicks_count: 2,       // 2 * 1.5 = 3
      cart_adds_count: 2,    // 2 * 3 = 6
      purchases_count: 1,    // 1 * 5 = 5
      wishlist_adds_count: 1,// 1 * 2 = 2
      availability_status: 'in_stock',
      last_event_at: now,
      first_published_at: pastPublish,
    };
    const { compositeScore } = rankingService.calculateCompositeScore(metrics);
    // Raw sum = 10 + 6 + 3 + 6 + 5 + 2 + (1/10 * 10 = 1.0) = 33.0
    assert.ok(Math.abs(compositeScore - 33.0) < 0.5, `Expected score ~33, got ${compositeScore}`);

    // Out of stock penalty = 0
    const outOfStock = rankingService.calculateCompositeScore({ ...metrics, availability_status: 'out_of_stock' });
    assert.equal(outOfStock.compositeScore, 0, 'Out of stock items must have score 0');

    // Low stock penalty = 20%
    const lowStock = rankingService.calculateCompositeScore({ ...metrics, availability_status: 'low_stock' });
    assert.ok(Math.abs(lowStock.compositeScore - (33.0 * 0.2)) < 0.5, 'Low stock items must receive 0.2 multiplier');

    // Cold start exploration boost
    const brandNew = rankingService.calculateCompositeScore({
      views_count: 0,
      purchases_count: 0,
      availability_status: 'in_stock',
      last_event_at: now,
      first_published_at: now,
    });
    assert.ok(brandNew.compositeScore > 10, `Brand new product must receive cold start bonus, got ${brandNew.compositeScore}`);
  });

  await t.test('2. Continuous Dynamic Re-Ranking Simulation (B overtakes A, C overtakes B)', async () => {
    mockDatabase.clear();

    // Baseline: Prod A has 10 views (score ~ 10), Prod B has 2 views (score ~ 2)
    mockDatabase.set('prod-A:global', {
      drug_id: 'prod-A',
      pharmacy_id: 'global',
      category: 'medicines',
      views_count: 10,
      first_published_at: new Date(Date.now() - 15 * 86400000),
      last_event_at: new Date(),
    });
    mockDatabase.set('prod-B:global', {
      drug_id: 'prod-B',
      pharmacy_id: 'global',
      category: 'cosmetics',
      views_count: 2,
      first_published_at: new Date(Date.now() - 15 * 86400000),
      last_event_at: new Date(),
    });

    await rankingService.updateScores('prod-A', 'global', 'medicines');
    await rankingService.updateScores('prod-B', 'global', 'cosmetics');

    let ranked = await rankingService.getRankedDrugIds({});
    assert.deepEqual(ranked.drugIds, ['prod-A', 'prod-B'], 'Initial rank: A must lead B');

    // Real-time events arrive for Product B: 2 purchases (10) + 1 cart (3) + 1 wishlist (2)
    await eventService.recordEvent({ eventType: 'purchase_completed', drugId: 'prod-B', category: 'cosmetics', quantity: 2 });
    await eventService.recordEvent({ eventType: 'product_added_to_cart', drugId: 'prod-B', category: 'cosmetics' });
    await eventService.recordEvent({ eventType: 'wishlist_added', drugId: 'prod-B', category: 'cosmetics' });

    // Dynamic verification: Product B immediately overtakes Product A!
    ranked = await rankingService.getRankedDrugIds({});
    assert.deepEqual(ranked.drugIds, ['prod-B', 'prod-A'], 'After live events, B dynamically overtakes A');

    // Product C arrives with high purchase volume
    await eventService.recordEvent({ eventType: 'purchase_completed', drugId: 'prod-C', category: 'baby_care', quantity: 5 });
    ranked = await rankingService.getRankedDrugIds({});
    assert.deepEqual(ranked.drugIds, ['prod-C', 'prod-B', 'prod-A'], 'Product C dynamically becomes #1');
  });

  await t.test('3. Default View (ALL Categories) vs Category-Specific View', async () => {
    mockDatabase.clear();
    const past = new Date(Date.now() - 15 * 86400000);

    mockDatabase.set('med-1:global', { drug_id: 'med-1', pharmacy_id: 'global', category: 'medicines', purchases_count: 10, views_count: 20, first_published_at: past, last_event_at: new Date() });
    mockDatabase.set('med-2:global', { drug_id: 'med-2', pharmacy_id: 'global', category: 'medicines', purchases_count: 8, views_count: 15, first_published_at: past, last_event_at: new Date() });
    mockDatabase.set('cos-1:global', { drug_id: 'cos-1', pharmacy_id: 'global', category: 'cosmetics', purchases_count: 15, views_count: 30, first_published_at: past, last_event_at: new Date() });
    mockDatabase.set('baby-1:global', { drug_id: 'baby-1', pharmacy_id: 'global', category: 'baby_care', purchases_count: 2, views_count: 5, first_published_at: past, last_event_at: new Date() });

    await rankingService.updateScores('med-1', 'global', 'medicines');
    await rankingService.updateScores('med-2', 'global', 'medicines');
    await rankingService.updateScores('cos-1', 'global', 'cosmetics');
    await rankingService.updateScores('baby-1', 'global', 'baby_care');

    // Default scope: ALL CATEGORIES together, sorted purely by dynamic score
    // cos-1 (score ~75) -> med-1 (score ~50) -> med-2 (score ~40) -> baby-1 (score ~10)
    const allCategoriesView = await rankingService.getRankedDrugIds({});
    assert.deepEqual(allCategoriesView.drugIds, ['cos-1', 'med-1', 'med-2', 'baby-1'], 'Default view ranks all categories together without quotas');

    // Category-specific view: Cosmetics
    const cosmeticsOnly = await rankingService.getRankedDrugIds({ category: 'cosmetics' });
    assert.deepEqual(cosmeticsOnly.drugIds, ['cos-1'], 'Category view filters before ranking');

    // Category-specific view: Medicines
    const medicinesOnly = await rankingService.getRankedDrugIds({ category: 'medicines' });
    assert.deepEqual(medicinesOnly.drugIds, ['med-1', 'med-2'], 'Medicines category ranks only medicines');
  });

  await t.test('4. Anti-Gaming Deduplication & Transaction Guarantees', async () => {
    const v1 = await eventService.recordEvent({ eventType: 'product_viewed', drugId: 'prod-Z', userId: 'user-anti-spam' });
    assert.equal(v1.counted, true, 'First view is counted');

    const v2 = await eventService.recordEvent({ eventType: 'product_viewed', drugId: 'prod-Z', userId: 'user-anti-spam' });
    assert.equal(v2.counted, false, 'Rapid duplicate view within suppression window is suppressed');

    const p1 = await eventService.recordEvent({ eventType: 'purchase_completed', drugId: 'prod-Z', userId: 'user-anti-spam' });
    assert.equal(p1.counted, true, 'Purchase is always counted as a transaction');
  });

  console.log('\n>>> ALL CONTINUOUS DYNAMIC RANKING TESTS PASSED SUCCESSFULLY! <<<\n');
});
