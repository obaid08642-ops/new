# 14.15 Hot-Path Index Checklist (DB work DEFERRED — infra wave)

> Code part only: call-sites are already guarded with `.maxTimeMS()` + projection + `.limit()`.
> Do NOT apply these from app code. An infra/migration wave must run the `createIndex`
> statements below against MongoDB (with `db.currentOp()` / explain review). No code execution here.

## 1. `insurance_companies` — catalogs.controller.ts `insuranceCatalog()` (companies leg)
- Query: `find({ is_active: true }).sort({ name_en: 1 }).limit(500).maxTimeMS(2000)`
- Guard: `project({ _id: 0 })`, limit 500, maxTimeMS 2000
```js
db.getCollection('insurance_companies').createIndex({ is_active: 1, name_en: 1 }, { name: 'idx_insurance_companies_active_name' });
```

## 2. `insurance_networks` — catalogs.controller.ts `insuranceCatalog()` (networks leg)
- Query: `find({ catalog_status: { $ne: 'retired' } }).limit(2000).maxTimeMS(2000)`
- Guard: `project({ _id: 0 })`, limit 2000, maxTimeMS 2000
```js
db.getCollection('insurance_networks').createIndex({ catalog_status: 1, company_id: 1 }, { name: 'idx_insurance_networks_status_company' });
```

## 3. `notification_templates` — notifications.service.ts `listTemplates()`
- Query: `find({}).sort({ key: 1 }).limit(500).maxTimeMS(2000)`
- Guard: `select({ _id: 0, __v: 0 })`, limit 500, maxTimeMS 2000
```js
db.getCollection('notification_templates').createIndex({ key: 1 }, { name: 'idx_notification_templates_key' });
```

## 4. `push_tokens` — notifications.service.ts `sendPush()` per-user fan-out
- Query: `find({ user_id, active: true }).limit(20).maxTimeMS(2000)`
- Guard: `select({ token: 1, provider: 1, _id: 0 })`, limit 20, maxTimeMS 2000
```js
db.getCollection('push_tokens').createIndex({ user_id: 1, active: 1 }, { name: 'idx_push_tokens_user_active' });
```

## 5. `seo_controls` — seo-search/seo.service.ts `loadControls()` (30s cached)
- Query: `find({}).limit(100).maxTimeMS(2000)`
- Guard: `project({ _id: 0 })`, limit 100, maxTimeMS 2000, fail-open + 30s cache
- Index: none required (tiny collection, <100 docs — collection scan acceptable).
  Optional, only if the collection ever grows:
```js
// db.getCollection('seo_controls').createIndex({ key: 1 }, { name: 'idx_seo_controls_key_optional', sparse: true });
```

## Infra-wave notes
- Run with `{ background: true }` on production or during a maintenance window; verify with `explain('executionStats')` that each guarded query hits its index (IXSCAN, no COLLSCAN except seo_controls).
- Sizing/seed/alerts are out of scope for 14.15 code part — handled by the infra wave.
