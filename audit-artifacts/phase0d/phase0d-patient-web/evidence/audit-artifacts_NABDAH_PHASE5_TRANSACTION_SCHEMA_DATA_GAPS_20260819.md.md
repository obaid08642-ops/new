# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE5_TRANSACTION_SCHEMA_DATA_GAPS_20260819.md`
- **Member SHA-256:** `c0d4d03b24a9448a626e22ceaa5af5813b5b6ffd9434d960588b84c6a920b005`
- **Line count:** 18
- **Read range:** `1-18`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: Transactions retain booking kind/ID, patient, gateway/method/status and payment/refund timestamps, and include a lookup index by booking kind/ID. This supports basic traceability.`
- `11: | **P0** | Schema has no unique idempotency constraint for active payment intent per booking | `booking_kind`/`booking_id` is a non-unique query index; neither idempotency key nor gateway intent ID is unique. Concurrent API calls can persis`
- `13: | **P1** | Monetary/refund fields lack explicit precision, currency and invariant validation | `amount`/`refunded_amount` are unrestricted number fields; schema does not enforce non-negative fixed precision, compatible currency, remaining r`
- `14: | **P1** | Refund/decision evidence omits actor, request/case, PSP reference and immutable history | Only reason/amount/time fields exist; no refund executor, approval/case ID, provider response/refund ID or append-only transition history i`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `12: | **P1** | Client secret and raw webhook payload are persisted and broadly returned by transaction queries | Schema stores `client_secret` and arbitrary `webhook_payload`; generic transaction list returns full documents to authorized staff.`
- `14: | **P1** | Refund/decision evidence omits actor, request/case, PSP reference and immutable history | Only reason/amount/time fields exist; no refund executor, approval/case ID, provider response/refund ID or append-only transition history i`
### state_transitions
- `3: ## Confirmed strength`
- `5: Transactions retain booking kind/ID, patient, gateway/method/status and payment/refund timestamps, and include a lookup index by booking kind/ID. This supports basic traceability.`
- `7: ## Confirmed defects`
- `13: | **P1** | Monetary/refund fields lack explicit precision, currency and invariant validation | `amount`/`refunded_amount` are unrestricted number fields; schema does not enforce non-negative fixed precision, compatible currency, remaining r`
- `14: | **P1** | Refund/decision evidence omits actor, request/case, PSP reference and immutable history | Only reason/amount/time fields exist; no refund executor, approval/case ID, provider response/refund ID or append-only transition history i`
### payment_insurance_relevance
- `5: Transactions retain booking kind/ID, patient, gateway/method/status and payment/refund timestamps, and include a lookup index by booking kind/ID. This supports basic traceability.`
- `11: | **P0** | Schema has no unique idempotency constraint for active payment intent per booking | `booking_kind`/`booking_id` is a non-unique query index; neither idempotency key nor gateway intent ID is unique. Concurrent API calls can persis`
- `12: | **P1** | Client secret and raw webhook payload are persisted and broadly returned by transaction queries | Schema stores `client_secret` and arbitrary `webhook_payload`; generic transaction list returns full documents to authorized staff.`
- `13: | **P1** | Monetary/refund fields lack explicit precision, currency and invariant validation | `amount`/`refunded_amount` are unrestricted number fields; schema does not enforce non-negative fixed precision, compatible currency, remaining r`
- `14: | **P1** | Refund/decision evidence omits actor, request/case, PSP reference and immutable history | Only reason/amount/time fields exist; no refund executor, approval/case ID, provider response/refund ID or append-only transition history i`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
