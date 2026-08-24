# Phase 0B semantic evidence — pharmacy_ops.controller.ts

**Archive member:** `src/modules/pharmacy_ops/pharmacy_ops.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–97; full 97-line member covered.

Lines 2–6 import PharmacyOpsService, auth decorators, UserRole and OrdersService. Lines 7–10 define canonical `pharmacy` controller with JwtAuthGuard and class-level Roles(UserRole.PHARMACY). Lines 13–23 expose GET `prescriptions/:rxNumber`: first calls OrdersService.getById(rx) without visible pharmacy ownership argument; if that returns an order it is returned immediately. Only the fallback list is pharmacy-scoped by u.id (18–22). This creates a potential direct-ID ownership gap if getById does not enforce pharmacy scope.

Lines 25–39 expose POST `reports/eod`, derive local-day boundaries, list pharmacy orders, calculate paid revenue from order totals and group states. No idempotency is relevant for read-like reporting, but date/timezone semantics, data projection, pagination, authoritative ledger reconciliation and failure distinction are not visible.

Lines 41–48 expose queue GETs for incoming/preparing/ready/completed/basket-review/awaiting-approval/refills, delegating to PharmacyOpsService. Lines 50–55 expose accept/reject/preparing/ready/partial mutations through OrdersService; only reject/partial have inline bodies and neither shows IdempotencyInterceptor. Lines 57–60 expose inventory GET and stock/add mutations; bodies are inline or `any`, with no DTO/IdempotencyInterceptor.

Lines 62–75 expose order detail and per-item unavailable/restore/qty/substitute plus basket submit and insurance status. Index is parsed with `parseInt` without NaN/range validation, and bodies include client substitute price/medicine/qty or insurance status/reason. No mutation route visibly applies idempotency, version/CAS, re-auth, body DTO or explicit state/role checks beyond controller-level pharmacy role.

Lines 78–97 define ProviderPharmacyAliasController at `/provider/pharmacy`, guarded only with JwtAuthGuard and no class-level Roles decorator. It delegates accept/submit-basket/insurance/dispatch; insurance defaults missing status to pending and lowercases it, while dispatch accepts arbitrary driver_id or marks ready. This alias can widen access if global role checks do not compensate, and it creates method/body parity risk against canonical routes.

**Audit judgment:** Canonical controller has a positive pharmacy role guard and owner-scoped service delegation for most operations, but exposes numerous untyped mutations without idempotency/atomicity and has a likely RX direct-lookup scope risk. The alias controller lacks explicit role restriction and delegates high-impact operations including dispatch.

No product code was changed and no tests were executed during this semantic read.
