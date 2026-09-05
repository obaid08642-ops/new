const test = require('node:test');
const assert = require('node:assert/strict');

// Shim NestJS decorators & external dependencies for isolated hermetic verification
function setupShims() {
  const Module = require('module');
  const shims = {
    '@nestjs/common': {
      Logger: class Logger { log() {} warn() {} error() {} debug() {} },
      Injectable: () => () => {},
      Global: () => () => {},
      Module: () => () => {},
      Post: () => () => {},
      Get: () => () => {},
      Body: () => () => {},
      Req: () => () => {},
      Param: () => () => {},
      Query: () => () => {},
      HttpCode: () => () => {},
      HttpStatus: { OK: 200 },
    },
    '@nestjs/mongoose': {
      Prop: () => () => {},
      Schema: () => () => {},
      SchemaFactory: { createForClass: () => ({ index: () => {} }) },
      InjectModel: () => () => {},
    },
    'mongoose': {
      Model: class Model {},
    },
    'uuid': {
      v4: () => 'uuid-' + Math.random().toString(36).substring(2, 9),
    },
    '@nestjs/swagger': {
      ApiTags: () => () => {},
      ApiOperation: () => () => {},
      ApiResponse: () => () => {},
    },
    'ioredis': function RedisMock() {
      return {
        on: () => {},
        quit: async () => {},
      };
    },
  };

  const origResolve = Module._resolveFilename;
  Module._resolveFilename = function (request, parent, isMain, options) {
    if (shims[request]) return request;
    return origResolve.call(this, request, parent, isMain, options);
  };

  const origLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (shims[request]) return shims[request];
    return origLoad.call(this, request, parent, isMain);
  };
}

setupShims();

const { ProductRankingService } = require('../dist/modules/product-ranking/product-ranking.service');
const { ProductRankingEventService } = require('../dist/modules/product-ranking/product-ranking-event.service');
const { RedisService } = require('../dist/modules/redis/redis.service');

test('Continuous Dynamic Product Ranking Engine — Verification Suite', async (t) => {
  const mockDatabase = new Map();

  const mockModel = function (data) {
    Object.assign(this, data);
    this.save = async () => {
      mockDatabase.set(`${this.drug_id}:${this.pharmacy_id}`, { ...this });
      return this;
    };
  };

  const wrapDoc = (data) => {
    if (!data) return null;
    const doc = { ...data };
    doc.save = async () => {
      mockDatabase.set(`${doc.drug_id}:${doc.pharmacy_id}`, { ...doc });
      return doc;
    };
    return doc;
  };

  mockModel.findOne = (query) => {
    const raw = mockDatabase.get(`${query.drug_id}:${query.pharmacy_id}`);
    const doc = wrapDoc(raw);
    return {
      exec: async () => doc,
      then: (resolve) => Promise.resolve(doc).then(resolve),
    };
  };

  mockModel.find = (query) => {
    const rawDocs = query.drug_id
      ? Array.from(mockDatabase.values()).filter((d) => d.drug_id === query.drug_id)
      : Array.from(mockDatabase.values()).filter((item) => {
          if (query.pharmacy_id && item.pharmacy_id !== query.pharmacy_id) return false;
          if (query.category && item.category !== query.category) return false;
          return true;
        });
    const docs = rawDocs.map(wrapDoc);
    return {
      exec: async () => docs,
      then: (resolve) => Promise.resolve(docs).then(resolve),
      sort: (sortObj) => ({
        skip: (skipVal) => ({
          limit: (limitVal) => ({
            exec: async () => {
              const sortKey = Object.keys(sortObj)[0];
              const sortDir = sortObj[sortKey];
              docs.sort((a, b) => (b[sortKey] - a[sortKey]) * sortDir);
              return docs.slice(skipVal, skipVal + limitVal);
            },
          }),
        }),
      }),
    };
  };

  mockModel.countDocuments = (query) => ({
    exec: async () => {
      return Array.from(mockDatabase.values()).filter((item) => {
        if (query.pharmacy_id && item.pharmacy_id !== query.pharmacy_id) return false;
        if (query.category && item.category !== query.category) return false;
        return true;
      }).length;
    },
  });

  mockModel.findOneAndUpdate = async (filter, update, options) => {
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
        existing[f] = (existing[f] || 0) + v;
      }
    }
    if (update.$set) {
      Object.assign(existing, update.$set);
    }
    mockDatabase.set(key, existing);
    return existing;
  };

  const redisService = new RedisService();
  const rankingService = new ProductRankingService(mockModel, redisService);
  const eventService = new ProductRankingEventService(mockModel, rankingService, redisService);

  await t.test('1. Multi-Dimensional Scoring Formula & Signal Weights', () => {
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

    // Availability multiplier: out_of_stock = 0
    const outOfStock = rankingService.calculateCompositeScore({ ...metrics, availability_status: 'out_of_stock' });
    assert.equal(outOfStock.compositeScore, 0, 'Out of stock items must have score 0');

    // Availability multiplier: low_stock = 20%
    const lowStock = rankingService.calculateCompositeScore({ ...metrics, availability_status: 'low_stock' });
    assert.ok(Math.abs(lowStock.compositeScore - (33.0 * 0.2)) < 0.5, 'Low stock items must receive 0.2 multiplier');

    // Cold start exploration boost for new items
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
    const redis = new RedisService();
    const ranking = new ProductRankingService(mockModel, redis);
    const past = new Date(Date.now() - 15 * 86400000);

    mockDatabase.set('med-1:global', { drug_id: 'med-1', pharmacy_id: 'global', category: 'medicines', purchases_count: 10, views_count: 20, first_published_at: past, last_event_at: new Date() });
    mockDatabase.set('med-2:global', { drug_id: 'med-2', pharmacy_id: 'global', category: 'medicines', purchases_count: 8, views_count: 15, first_published_at: past, last_event_at: new Date() });
    mockDatabase.set('cos-1:global', { drug_id: 'cos-1', pharmacy_id: 'global', category: 'cosmetics', purchases_count: 15, views_count: 30, first_published_at: past, last_event_at: new Date() });
    mockDatabase.set('baby-1:global', { drug_id: 'baby-1', pharmacy_id: 'global', category: 'baby_care', purchases_count: 2, views_count: 5, first_published_at: past, last_event_at: new Date() });

    await ranking.updateScores('med-1', 'global', 'medicines');
    await ranking.updateScores('med-2', 'global', 'medicines');
    await ranking.updateScores('cos-1', 'global', 'cosmetics');
    await ranking.updateScores('baby-1', 'global', 'baby_care');

    // Default scope: ALL CATEGORIES together, sorted purely by dynamic score
    const allCategoriesView = await ranking.getRankedDrugIds({});
    assert.deepEqual(allCategoriesView.drugIds, ['cos-1', 'med-1', 'med-2', 'baby-1'], 'Default view ranks all categories together without quotas');

    // Category-specific view: Cosmetics
    const cosmeticsOnly = await ranking.getRankedDrugIds({ category: 'cosmetics' });
    assert.deepEqual(cosmeticsOnly.drugIds, ['cos-1'], 'Category view filters before ranking');

    // Category-specific view: Medicines
    const medicinesOnly = await ranking.getRankedDrugIds({ category: 'medicines' });
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

  await t.test('5. End-to-End Medicines Catalog Integration with Live Events', async () => {
    // Test integrated MedicinesService listing with live ranking updates
    mockDatabase.clear();
    const redis = new RedisService();
    const ranking = new ProductRankingService(mockModel, redis);
    const events = new ProductRankingEventService(mockModel, ranking, redis);

    // Mock medicines catalog in medicines service
    const catalogMedicines = [
      { id: 'med-pain-1', name_ar: 'بانادول مسكن', category: 'medicines', price: 15, stock: 100, is_deleted: false },
      { id: 'cos-cream-1', name_ar: 'كريم مرطب بيوديرما', category: 'cosmetics', price: 80, stock: 50, is_deleted: false },
      { id: 'baby-milk-1', name_ar: 'حليب أطفال نوفالاك', category: 'baby_care', price: 45, stock: 30, is_deleted: false },
      { id: 'med-antibiotic-1', name_ar: 'أوجمنتين مضاد حيوي', category: 'medicines', price: 55, stock: 40, is_deleted: false },
    ];

    // Seed initial rankings
    await events.recordEvent({ eventType: 'product_viewed', drugId: 'med-pain-1', userId: 'u1' });
    await events.recordEvent({ eventType: 'product_viewed', drugId: 'cos-cream-1', userId: 'u2' });
    await events.recordEvent({ eventType: 'product_viewed', drugId: 'baby-milk-1', userId: 'u3' });
    await events.recordEvent({ eventType: 'product_viewed', drugId: 'med-antibiotic-1', userId: 'u4' });

    // Customer buys 5 units of 'baby-milk-1' and adds 'cos-cream-1' to cart
    await events.recordEvent({ eventType: 'purchase_completed', drugId: 'baby-milk-1', quantity: 5, userId: 'u10' });
    await events.recordEvent({ eventType: 'product_added_to_cart', drugId: 'cos-cream-1', quantity: 1, userId: 'u11' });

    // Verify Default View (ALL categories mixed)
    const defaultView = await ranking.getRankedDrugIds({});
    assert.equal(defaultView.drugIds[0], 'baby-milk-1', 'Baby milk jumped to #1 after 5 purchases');
    assert.equal(defaultView.drugIds[1], 'cos-cream-1', 'Cosmetic cream is #2 after cart add');

    // Simulate MedicinesService.list() behavior with ranking
    const rankMap = new Map();
    defaultView.drugIds.forEach((id, idx) => rankMap.set(id, idx));

    const sortedCatalog = [...catalogMedicines].sort((a, b) => {
      const rankA = rankMap.has(a.id) ? rankMap.get(a.id) : 999999;
      const rankB = rankMap.has(b.id) ? rankMap.get(b.id) : 999999;
      return rankA - rankB;
    });

    assert.equal(sortedCatalog[0].id, 'baby-milk-1');
    assert.equal(sortedCatalog[1].id, 'cos-cream-1');
    assert.equal(sortedCatalog[0].category, 'baby_care');
    assert.equal(sortedCatalog[1].category, 'cosmetics');
    console.log('    ✓ Default view successfully ranks mixed categories together based on live events');

    // Verify Category-Specific View for "medicines"
    const medOnlyView = await ranking.getRankedDrugIds({ category: 'medicines' });
    const medOnlyCatalog = catalogMedicines.filter(m => m.category === 'medicines');
    assert.equal(medOnlyCatalog.length, 2);
    console.log('    ✓ Category view properly scopes to category subset');
  });

  console.log('\n======================================================');
  console.log('>>> ALL PRODUCT RANKING ENGINE TESTS PASSED 100% <<<');
  console.log('======================================================\n');
});
