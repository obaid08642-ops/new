# Phase 0B semantic evidence — admin-web-core/schemas/commission-ledger.schema.ts

**Archive member:** `src/modules/admin-web-core/schemas/commission-ledger.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–30; full 30-line member covered.

Lines 2–4 import Mongoose Document/Types and define CommissionLedgerDocument. Lines 6–30 define a timestamped CommissionLedger schema.

Lines 8–9 require providerId as a User ObjectId reference. Lines 11–12 require a providerName snapshot. Lines 14–15 require providerType limited to doctor, pharmacy or home_care. Lines 17–27 require baseBill, systemCommission, vatOnCommission and providerEarning. Line 30 creates the schema.

**Audit judgment:** The schema has no booking/order/service reference, currency, integer precision, nonnegative/finite bounds, commission-rate/version, tax jurisdiction, settlement status, reversal/refund linkage, unique idempotency/reference key, immutable/audit actor fields, or tenant/provider account binding beyond providerId. It therefore cannot alone prevent duplicate commission rows, reconcile commission to the source transaction, or prove exact financial calculation and reversal lifecycle.

No product code was changed and no tests were executed during this semantic read.
