# Phase 0B semantic evidence — Provider Payouts

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:**
- `src/modules/payouts/provider-payouts.controller.ts:2–120`

`ProviderPayoutsController` is JWT guarded and exposes payout request, mine and balance routes (`provider-payouts.controller.ts:9–15,45–120`). No visible `Roles` decorator or provider-role assertion is present in this controller; authorization relies on `user.id` from the session and downstream ledger/bank data. IBAN validation requires the Saudi pattern `SA` plus 22 digits (`20–25`).

`balanceForReservation` aggregates all ledger entries for a provider, computing cleared earnings, pending earnings, debits, paid and locked amounts, then derives available balance (`27–42`). Payout request validates amount and an idempotency key, creates a unique index at request time, checks an approved bank account and minimum payout config, then uses a Mongo transaction to recheck idempotency, balance, pending withdrawal and insert a withdrawal plus locked ledger reservation (`45–108`). It stores and returns raw IBAN, bank name, bank account ID, provider role, balance snapshots and ledger metadata (`80–97`).

`mine` returns up to 50 withdrawal documents with only `_id` excluded, and `balance` delegates to `LedgerService` (`111–119`). The request path has no visible amount/currency source version, role/organization scope, payout rail status, approval/settlement/reconciliation route, retry/compensation or masking policy. The idempotency key is accepted in the body rather than a canonical request header and the index is created lazily.

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: missing role/scope enforcement, bank/IBAN PII exposure, lazy index creation, full withdrawal document disclosure, mutable ledger-balance semantics, body idempotency contract drift, and incomplete payout lifecycle/reconciliation controls.
