# Phase 8 — Batch AA: provider payout reservation integrity

## Purpose

Provider withdrawal requests were written to a collection not read by the admin payout queue, checked available balance outside any reservation, accepted request/profile IBAN values regardless of bank review state, and had no idempotency identity. The same cleared earnings could therefore be requested concurrently. The Provider app considered any bank record sufficient and did not receive a server reference for its request.

## Source change

| Surface | Implemented control |
|---|---|
| Canonical withdrawal record | `POST /provider/payouts/request` now writes the `providerwithdrawals` collection consumed by the admin finance queue with `PENDING_ADMIN_APPROVAL`, immutable bank snapshot, server reference and idempotency key. The unreserved `/provider/wallet/withdraw` alias now fails closed. |
| Bank destination | A payout requires a `provider_bank_accounts` record with `review_status: approved`. The client no longer submits or selects an IBAN for payout; the server snapshots the approved record. |
| Atomic reservation | A MongoDB transaction checks current ledger balance, pending request and idempotency key, creates the withdrawal request, and writes one `payout` ledger entry in `locked` state. Available balance now subtracts locked reservations. |
| Idempotency | The provider/idempotency-key unique index and duplicate lookup return the original request/reference on retry. |
| Admin settlement/rejection | Admin execution requires the matching locked reservation, promotes it to `cleared` rather than adding a second payout debit, and uses its amount for the available-balance check. Rejection moves the reservation to `released`, restoring available balance. |
| Provider UI | Shared and Nursing wallet entry points send an idempotency key, require the returned server request/reference, recognize canonical pending states, require verified bank status, and state that a request is **reserved for review**, not a completed transfer. |

## Verification

| Gate | Result |
|---|---|
| Focused payout-reservation Backend suite | **PASS** — 3 tests: unverified-bank refusal, idempotent retry, transaction request + locked entry. |
| Full Backend regression suite | **PASS** — 56 suites, 344 tests. |
| Backend production build | **PASS** — `nest build`. |
| Provider release-contract suite | **PASS** — 1 suite, 13 tests. |
| Provider TypeScript check | **PASS** — `npx tsc --noEmit`. |
| Provider production Expo web export | **PASS**. |
| Archive integrity | **PASS** — rebuilt Backend and Provider archives validate with `unzip -tq`; dependencies and build outputs are excluded. |
| Backend archive SHA-256 | `2b2730a6f2bd287e87fa186106ec3b0f54db4b86c91b7f5f429900219ca0425d` |
| Provider archive SHA-256 | `1a6488f4b4a300743c2f9518c7cda9befecea3801bab474ee87144ba6f20dbae` |
| Branch upload | **PASS** — source commit `adf32f1` (`fix: reserve provider payouts atomically`) is on `manus/on-live-reconciliation`. |

## Acceptance limits

No withdrawal, bank account, ledger entry, payment gateway call, or production data was created or altered. Phase 11 must verify linked sandbox ledger settlement, concurrent/double-tap requests, approved versus pending/rejected bank destination, admin execute/reject release behavior, large-payout maker-checker, reference display, notification/audit evidence and post-deployment BOLA. Actual bank transfer execution and any gateway activation remain explicitly out of scope and require owner/reviewer approval.
