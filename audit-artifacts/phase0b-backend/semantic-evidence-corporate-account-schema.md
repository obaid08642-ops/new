# Phase 0B semantic evidence — CorporateAccount schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/corporate-account.schema.ts:1–28`

The timestamped `corporate_accounts` schema defines a generated unique ID, required unique/indexed companyName, required employeeLimit/default zero, individualCreditLimit/default zero, usedCredit/default zero, and required billingCycleEnd (`7–28`). The company name uniqueness/index is the only explicit query/identity control (`12–13`).

No tenant/legal-entity identifier, organization owner, administrator, billing contact, verification/KYC status or account lifecycle is represented (`9–25`). Employee and credit fields are unconstrained numbers: no nonnegative/integer bounds, maximum, currency, decimal precision, effective period, available-credit invariant or atomic/optimistic update semantics exist (`15–22`). `usedCredit` has no ledger/transaction/order/member attribution, reversal/refund/chargeback handling or reconciliation (`21–22`). billingCycleEnd has no start/current cycle, timezone, renewal/status, grace period or overdue policy (`24–25`). No member enrollment/employee ownership, per-user spend authorization, idempotency, audit actor, PII classification, retention/deletion or cross-tenant access policy is represented. No code was changed and no build/test/application operation was performed during this read.
