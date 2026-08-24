# Phase 0B semantic evidence — PharmacySeedService

**Archive member:** `src/modules/pharmacy/services/pharmacy-seed.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–130 from the baseline archive extraction.

Lines 1–26 define repositories for pharmacy orders, inventory, provider accounts/profiles/availability and exact admin-role assertion. Lines 28–32 define a test-only seed guard requiring `NODE_ENV=test` and `ALLOW_TEST_SEED=true`.

Lines 34–111 implement `seed`. It requires admin role and test-only configuration, then creates or updates two named approved pharmacy provider accounts with fixed test emails, generated random phone numbers, bcrypt password `Pharm@123456`, fixed Riyadh locations, availability accepting orders, and hard-coded overlapping inventory including SKU, stock, price, names, generics, dosage, form, and substitute SKU. Existing records are upserted by email/account/SKU and returned as created metadata.

Lines 113–129 implement `seedSampleOrder`. It requires only the test-only guard, accepts arbitrary patient account ID, and creates a DRAFT order with fixed Arabic medicines, SKUs, quantities, Riyadh delivery coordinates, and `created_by_seed` timeline event.

**Auth/ownership:** seed requires admin plus test-only environment; sample order has no visible patient/admin actor authorization beyond environment guard and accepts patient ID as a parameter.

**State transitions:** creates approved test providers/availability/inventory; sample order starts DRAFT.

**Price/payment/insurance source:** all test inventory prices and order items are hard-coded test fixtures; no payment/insurance logic.

**Security/truthfulness observations:** explicit test-only barrier prevents normal production execution; fixed credentials/fixture accounts are present in source but gated; `Math.random` phone generation is nondeterministic; seed is described as idempotent via upserts but returned `created` list includes existing/upserted entries; sample order can be created for arbitrary patient ID if endpoint boundary is compromised; no cleanup or expiry is visible.

**Test implications:** environment/role gates, repeated seed behavior, fixture isolation, arbitrary patient ID authorization, no production execution, hard-coded-data scanner, and cleanup after test. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
