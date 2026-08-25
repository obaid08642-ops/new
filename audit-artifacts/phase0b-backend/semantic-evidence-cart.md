# Phase 0B semantic evidence — Unified cart and pharmacy checkout

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/cart/cart.module.ts:2–259`

`UnifiedCart` stores patient ownership and an array of raw line objects containing kind, service ID, names, price, quantity, payment method, insurance, home-visit, notes and arbitrary metadata (`cart.module.ts:17–40`). `ensureCart` finds/creates by patient ID without a visible unique-race recovery; `summarize` trusts stored prices/quantities and computes a hard-coded home-visit fee of 50 (`51–75`). Generic `addLine` accepts caller name/price/kind/meta, merges by service/kind and saves the whole document; quantity/payment/notes are not visibly bounded or server-reconciled (`77–102`). Contract pharmacy item addition resolves medicine identity/price for catalog items but manual entries become zero-price pending-review lines (`104–125`).

Line update/remove/clear operate on a loaded cart and save without visible version predicate or idempotency for legacy routes; update accepts quantity/payment/insurance/home_visit/notes, and quantity <= 0 removes the line (`127–153`). Checkout preparation merely summarizes. Contract checkout permits cash only, rejects prescription media, validates address existence and numeric coordinates, sends medicine/manual items to OrdersService, then clears the cart in a separate save; no visible transaction, stock reservation, quote snapshot, price refresh, address authorization beyond profile lookup, or rollback if cart clearing fails (`156–203`).

The controller is JWT guarded. Contract item add/update/remove and checkout use `RequireIdempotency`, but legacy line mutations and clear do not. Contract update passes only quantity, while legacy update accepts broader fields. Prescription endpoint returns the latest non-dispensed/non-archived patient prescription with medication name/dose/quantity projection, but no pagination/version or explicit prescription authorization beyond patient ID (`206–247`). Module imports orders/users and registers cart/prescription/medicine models (`249–259`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: client-controlled cart pricing/metadata, hard-coded fee, concurrent cart races, legacy idempotency gaps, cash-only contract limitations, non-atomic order/cart checkout, manual prescription handling and missing quote/stock/payment binding.
