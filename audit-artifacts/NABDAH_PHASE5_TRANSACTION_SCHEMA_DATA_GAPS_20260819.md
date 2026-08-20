# Phase 5 Backend/Database — transaction schema constraints gaps

## Confirmed strength

Transactions retain booking kind/ID, patient, gateway/method/status and payment/refund timestamps, and include a lookup index by booking kind/ID. This supports basic traceability.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|
| **P0** | Schema has no unique idempotency constraint for active payment intent per booking | `booking_kind`/`booking_id` is a non-unique query index; neither idempotency key nor gateway intent ID is unique. Concurrent API calls can persist multiple active transactions for one booking. | Add appropriate compound partial unique indexes (active attempt policy), client/server idempotency key and unique gateway intent/charge IDs; reconcile existing duplicates before enforcing. |
| **P1** | Client secret and raw webhook payload are persisted and broadly returned by transaction queries | Schema stores `client_secret` and arbitrary `webhook_payload`; generic transaction list returns full documents to authorized staff. | Encrypt/minimize sensitive fields, redact DTOs by viewer/purpose, do not expose client secret beyond intended owner/session, and apply retention/access audit to raw PSP payloads. |
| **P1** | Monetary/refund fields lack explicit precision, currency and invariant validation | `amount`/`refunded_amount` are unrestricted number fields; schema does not enforce non-negative fixed precision, compatible currency, remaining refundable amount or partial-refund transition rules. | Use integer minor units or validated decimal policy, immutable currency/amount, conditional remaining-refund constraints and ledger-linked transaction state. |
| **P1** | Refund/decision evidence omits actor, request/case, PSP reference and immutable history | Only reason/amount/time fields exist; no refund executor, approval/case ID, provider response/refund ID or append-only transition history is stored. | Persist append-only payment/refund event ledger with actor/role/case/PSP reference/idempotency/version and reconcile with booking/payment state. |

## Decision

Transaction schema is **FIX/BLOCKED** as a financial source of truth until it carries database-enforced idempotency, constrained money semantics and purpose-limited sensitive data exposure.
