# Phase 0B semantic evidence — pharmacy.controllers.ts

**Archive member:** `src/modules/pharmacy/pharmacy.controllers.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–210 from the baseline archive extraction.

Lines 1–21 define controller dependencies, JWT guard, role metadata, and patient pharmacy routes under `patient/pharmacy`. Patient endpoints cover order create/list/detail/update/submit/cancel and are controller-level patient-role guarded.

Lines 31–60 define provider pharmacy routes under `provider/pharmacy`. Allocation reads and actions cover allocation detail, item actions, confirm/preparing/ready/out-for-delivery/delivered/insurance/cancel; provider role is checked explicitly for allocation listing/detail, while several mutations rely on service checks.

Lines 62–94 define provider order actions: accept, submit-basket, insurance, preparing, ready, dispatch. These are JWT-guarded but do not show controller-level idempotency or explicit provider-role metadata on each method.

Lines 96–107 define provider inventory search/restock/low-stock-alerts/acknowledge routes. Lines 109–136 define admin pharmacy seed, sample order, manual split, and expire-stale routes; test seed is blocked unless NODE_ENV=test and ALLOW_TEST_SEED=true. Manual split has backward-compatible broadcast fallback.

Lines 138–160 define provider/admin broadcast routes: list/detail, have-all, partial, reject, advance, fallback-split, and expire-stale. Provider route has JWT only at controller level and delegates authorization to service; admin controller uses admin role metadata.

Lines 162–180 define patient/provider chat routes for thread listing/messages/post/accept-substitute/reject/remove-item and admin auto-close sweep. Lines 182–202 define provider/admin shortage flag routes, including report/list, dashboard, mark/approve/reject/resolve. Lines 204–210 define patient shortage lookup by SKU/generic name with patient role metadata, but no public decorator despite lookup semantics.

**Auth/ownership:** patient controller role guard; admin role guard; provider allocation list/detail explicit role checks; many provider/admin mutations rely on service-level checks not visible at HTTP layer. Controller uses JWT guard globally and no visible ownership decorator.

**State transitions:** patient order create → submit/cancel; provider allocation/order lifecycle; broadcast rounds/fallback; chat substitute decisions; shortage flag lifecycle; admin seed/split/expiry.

**Price/payment/insurance source:** order/insurance bodies are opaque `any`; pricing/payment validation delegated to services; no idempotency key extraction is visible in this controller.

**Security/truthfulness observations:** broad `any` bodies and no DTO validation shown; several mutations lack visible idempotency handling; provider role is inconsistently declared/enforced at controller boundary; patient shortage lookup is session-protected though structurally catalog-like; admin seed is explicitly fail-closed outside test configuration.

**Test implications:** role/ownership on every provider/admin action, unauth/stranger behavior, DTO validation, mutation idempotency/replay, test-seed gate, broadcast and shortage state transitions, chat participant privacy, and patient lookup access. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
