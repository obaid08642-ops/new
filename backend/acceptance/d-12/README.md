# D-12 — price ceiling on pharmacy offers (owner decision 2026-10-06 item 12, answer O-1)

Run: `cd backend && node scripts/run-acceptance.mjs d-12` (needs `redis-server`; builds and starts `dist/main.js` on an in-memory replica set). `live-server.ts` is part of the spec.

1. `scripts/migrations/2026-10-sfda-price-from-catalogue.ts` (dry-run default, `--apply`): `sfda_price = price`, `sfda_price_source` contains "catalogue", `sfda_price_updated_at`.
2. An offer line mapped to the catalogue (inventory sku = catalogue sku, or inventory `medicine_id`) above `sfda_price` (listed or override) → 400 naming the ceiling.
3. An unmapped medicine line: kept, marked `not_verified`, listed in `GET /api/v1/admin/pharmacy/price-review` (admin), and the offer cannot be submitted while it remains (400 `price_not_verified`).
4. `PATCH /medicines/admin/catalog/:id { sfda_price }`: admin only, audit-logged with old and new value.

Important for rollout: until the migration runs every medicine line is "not verified", so the import must run before the rule is switched on (owner note in decision 12).
