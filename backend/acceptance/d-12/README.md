# D-12 — catalogue price on pharmacy offers (owner decision 12, revised 2026-10-10)

Run: `cd backend && node scripts/run-acceptance.mjs d-12` (needs `redis-server`; builds and starts `dist/main.js` on an in-memory replica set). `live-server.ts` is part of the spec.

**Revised 2026-10-10 (owner):** a price above the catalogue is **allowed**. The official price may have risen before our catalogue was updated, and cosmetics/hair/skin items have free prices. Blocking would make the pharmacy refuse the order. Instead: warn the pharmacy and tell the admin, who updates the catalogue price when the new official price is confirmed.

1. `scripts/migrations/2026-10-sfda-price-from-catalogue.ts` (dry-run default, `--apply`): `sfda_price = price`, `sfda_price_source` contains "catalogue", `sfda_price_updated_at`.
2. An offer line mapped to the catalogue (inventory sku = catalogue sku, or inventory `medicine_id`) above `sfda_price` (listed or override) is **accepted**:
   - the offer item stores `above_catalogue_price: true` and `catalogue_price`;
   - the draft answer carries the warning code `price_above_catalogue`;
   - the admin gets one notification (role `admin`, `title_key` mentioning `price_above_catalogue`) and an entry in `GET /api/v1/admin/pharmacy/price-review`.
   At or below the price: no flag, no warning, no notice.
3. An unmapped line: kept, marked `not_verified`, listed in the admin review list. It does **not** block submitting.
4. `PATCH /medicines/admin/catalog/:id { sfda_price }`: admin only, audit-logged with the old and new value.

UI (design session, after this merges):
- **Provider app:** the offer composer shows the catalogue price next to each line. A higher price shows a notice, not an error: «أسعار الأدوية جبرية: غيّر السعر فقط إذا تغيّر السعر الرسمي فعلاً». Six-language rule: provider app ar/en.
- **Admin:** the price-review list with "update the catalogue price" from the row.
