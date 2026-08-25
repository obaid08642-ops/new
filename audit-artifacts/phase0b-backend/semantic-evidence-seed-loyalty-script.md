# Phase 0B semantic evidence — Seed loyalty script

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `scripts/seed-loyalty.ts:1–139`

The script is explicitly a seed for default loyalty challenges and rewards and claims to provide “real data” and be safe to rerun (`2–6`). It is `@ts-nocheck`, invokes `npx ts-node` directly, and selects `process.env.MONGO_URI` with a localhost `mongodb://localhost:27017/nabdah` fallback (`1–10`). There is no environment/database identity gate, production denial, operator authorization, dry-run or provenance/approval check. The challenge and reward catalogs are hardcoded in-process arrays (`18–111`), including point thresholds, cashback/coupon values in SAR and a fixed stock of `999` for every reward (`66–110,124–129`).

The script computes `now` and a 90-day end date at execution time (`12–13`), then upserts by a short `id` while unconditionally setting active/date/stock fields (`117–129`). It has no visible unique index validation, version/reconciliation policy, audit actor/source, catalog approval, currency/tax/effective-date semantics, per-user redemption limits, inventory reservation, expiration/revocation, financial ledger linkage or atomic coupling between reward redemption and wallet/coupon issuance. Counting active documents is used only for a console result (`132–134`), not as a reconciliation or integrity check. `mongoose.disconnect()` runs only on the success path (`135`); catch logs the error and exits without guaranteed cleanup (`138`). No product code was changed and the script was not executed; no builds/tests were run during this semantic read.
