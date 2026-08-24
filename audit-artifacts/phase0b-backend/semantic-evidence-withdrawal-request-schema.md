# Phase 0B semantic evidence — admin-web-core/schemas/withdrawal-request.schema.ts

**Archive member:** `src/modules/admin-web-core/schemas/withdrawal-request.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–27; full 27-line member covered.

Lines 2–4 import Mongoose Document/Types and define WithdrawalRequestDocument. Lines 6–27 define a timestamped WithdrawalRequest schema.

Lines 8–9 store providerId as required User ObjectId reference. Lines 11–21 require providerName, amount, bankName and IBAN. Lines 23–24 restrict status to `pending` or `completed`, defaulting to pending. Line 27 creates the schema.

**Audit judgment:** Legacy withdrawal schema has no currency, amount precision/nonnegative bound, withdrawal request/idempotency key, unique active request constraint, rejection status/reason, decided actor/time, maker-checker approval operation, reservation reference, tenant/provider ownership guard, bank-account verification state, or IBAN minimization/encryption/index policy. It also omits an explicit rejected state although the admin controller writes rejected status to this collection, so schema enum and controller lifecycle are inconsistent. The `providerName` snapshot is mutable/duplicable and can become stale versus provider identity.

No product code was changed and no tests were executed during this semantic read.
