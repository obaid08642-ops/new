# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_AA_PROVIDER_PAYOUT_RESERVATION_INTEGRITY_20260819.md`
- **Member SHA-256:** `f5c82fa1c65861cb2ae936fbf490625216515f1ef91e4524d6c37d618498d9dd`
- **Line count:** 35
- **Read range:** `1-35`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: | Bank destination | A payout requires a `provider_bank_accounts` record with `review_status: approved`. The client no longer submits or selects an IBAN for payout; the server snapshots the approved record. |`
- `14: | Idempotency | The provider/idempotency-key unique index and duplicate lookup return the original request/reference on retry. |`
- `22: | Focused payout-reservation Backend suite | **PASS** — 3 tests: unverified-bank refusal, idempotent retry, transaction request + locked entry. |`
- `31: | Branch upload | **PASS** — source commit `adf32f1` (`fix: reserve provider payouts atomically`) is on `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- `11: | Canonical withdrawal record | `POST /provider/payouts/request` now writes the `providerwithdrawals` collection consumed by the admin finance queue with `PENDING_ADMIN_APPROVAL`, immutable bank snapshot, server reference and idempotency ke`
### auth_ownership
- `5: Provider withdrawal requests were written to a collection not read by the admin payout queue, checked available balance outside any reservation, accepted request/profile IBAN values regardless of bank review state, and had no idempotency id`
- `11: | Canonical withdrawal record | `POST /provider/payouts/request` now writes the `providerwithdrawals` collection consumed by the admin finance queue with `PENDING_ADMIN_APPROVAL`, immutable bank snapshot, server reference and idempotency ke`
- `15: | Admin settlement/rejection | Admin execution requires the matching locked reservation, promotes it to `cleared` rather than adding a second payout debit, and uses its amount for the available-balance check. Rejection moves the reservation`
- `35: No withdrawal, bank account, ledger entry, payment gateway call, or production data was created or altered. Phase 11 must verify linked sandbox ledger settlement, concurrent/double-tap requests, approved versus pending/rejected bank destina`
### state_transitions
- `5: Provider withdrawal requests were written to a collection not read by the admin payout queue, checked available balance outside any reservation, accepted request/profile IBAN values regardless of bank review state, and had no idempotency id`
- `11: | Canonical withdrawal record | `POST /provider/payouts/request` now writes the `providerwithdrawals` collection consumed by the admin finance queue with `PENDING_ADMIN_APPROVAL`, immutable bank snapshot, server reference and idempotency ke`
- `12: | Bank destination | A payout requires a `provider_bank_accounts` record with `review_status: approved`. The client no longer submits or selects an IBAN for payout; the server snapshots the approved record. |`
- `13: | Atomic reservation | A MongoDB transaction checks current ledger balance, pending request and idempotency key, creates the withdrawal request, and writes one `payout` ledger entry in `locked` state. Available balance now subtracts locked `
- `14: | Idempotency | The provider/idempotency-key unique index and duplicate lookup return the original request/reference on retry. |`
- `16: | Provider UI | Shared and Nursing wallet entry points send an idempotency key, require the returned server request/reference, recognize canonical pending states, require verified bank status, and state that a request is **reserved for revi`
- `22: | Focused payout-reservation Backend suite | **PASS** — 3 tests: unverified-bank refusal, idempotent retry, transaction request + locked entry. |`
- `35: No withdrawal, bank account, ledger entry, payment gateway call, or production data was created or altered. Phase 11 must verify linked sandbox ledger settlement, concurrent/double-tap requests, approved versus pending/rejected bank destina`
### payment_insurance_relevance
- `1: # Phase 8 — Batch AA: provider payout reservation integrity`
- `5: Provider withdrawal requests were written to a collection not read by the admin payout queue, checked available balance outside any reservation, accepted request/profile IBAN values regardless of bank review state, and had no idempotency id`
- `11: | Canonical withdrawal record | `POST /provider/payouts/request` now writes the `providerwithdrawals` collection consumed by the admin finance queue with `PENDING_ADMIN_APPROVAL`, immutable bank snapshot, server reference and idempotency ke`
- `12: | Bank destination | A payout requires a `provider_bank_accounts` record with `review_status: approved`. The client no longer submits or selects an IBAN for payout; the server snapshots the approved record. |`
- `13: | Atomic reservation | A MongoDB transaction checks current ledger balance, pending request and idempotency key, creates the withdrawal request, and writes one `payout` ledger entry in `locked` state. Available balance now subtracts locked `
- `15: | Admin settlement/rejection | Admin execution requires the matching locked reservation, promotes it to `cleared` rather than adding a second payout debit, and uses its amount for the available-balance check. Rejection moves the reservation`
- `16: | Provider UI | Shared and Nursing wallet entry points send an idempotency key, require the returned server request/reference, recognize canonical pending states, require verified bank status, and state that a request is **reserved for revi`
- `22: | Focused payout-reservation Backend suite | **PASS** — 3 tests: unverified-bank refusal, idempotent retry, transaction request + locked entry. |`
- `31: | Branch upload | **PASS** — source commit `adf32f1` (`fix: reserve provider payouts atomically`) is on `manus/on-live-reconciliation`. |`
- `35: No withdrawal, bank account, ledger entry, payment gateway call, or production data was created or altered. Phase 11 must verify linked sandbox ledger settlement, concurrent/double-tap requests, approved versus pending/rejected bank destina`
### error_empty_loading_retry_cancel
- `11: | Canonical withdrawal record | `POST /provider/payouts/request` now writes the `providerwithdrawals` collection consumed by the admin finance queue with `PENDING_ADMIN_APPROVAL`, immutable bank snapshot, server reference and idempotency ke`
- `13: | Atomic reservation | A MongoDB transaction checks current ledger balance, pending request and idempotency key, creates the withdrawal request, and writes one `payout` ledger entry in `locked` state. Available balance now subtracts locked `
- `14: | Idempotency | The provider/idempotency-key unique index and duplicate lookup return the original request/reference on retry. |`
- `16: | Provider UI | Shared and Nursing wallet entry points send an idempotency key, require the returned server request/reference, recognize canonical pending states, require verified bank status, and state that a request is **reserved for revi`
- `22: | Focused payout-reservation Backend suite | **PASS** — 3 tests: unverified-bank refusal, idempotent retry, transaction request + locked entry. |`
- `35: No withdrawal, bank account, ledger entry, payment gateway call, or production data was created or altered. Phase 11 must verify linked sandbox ledger settlement, concurrent/double-tap requests, approved versus pending/rejected bank destina`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
