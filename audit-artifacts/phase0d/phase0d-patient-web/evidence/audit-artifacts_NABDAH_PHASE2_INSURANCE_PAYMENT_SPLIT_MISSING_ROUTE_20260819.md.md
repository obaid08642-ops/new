# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_INSURANCE_PAYMENT_SPLIT_MISSING_ROUTE_20260819.md`
- **Member SHA-256:** `6bb3a2412b7292c46effa02d719091948b087173a2dd5438a7f8d657e3bb6f58`
- **Line count:** 26
- **Read range:** `1-26`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: with client-computed service total, patient share, company share, and a selected payment method. A source-wide Backend search found **no `payment-confirm` route** in the authoritative Backend tree.`
- `19: | Confirmation call | The Patient payment-split flow fails at the final API call | **P0 FIX — replace route with a documented, server-owned flow; do not add a permissive endpoint that trusts client totals** |`
- `20: | Payment amounts | UI derives total, company share, and patient share from route parameters plus coverage response | Client can present/submit a split not bound to a real owned booking or insurance request | **P0 FIX — load server-owned re`
- `22: | Redirect result | UI derives target screen from client `serviceType` and response fallback fields | A failed/malformed response can send the user to an unrelated success/tracking route | **FIX — return canonical entity kind/id/state from `
### backend_consumers_or_contracts
- `5: `app/insurance/payment-split.tsx` calls:`
- `8: POST /insurance/payment-confirm`
- `13: The current backend insurance flow exposes request/coverage/coplay mechanisms, including the alias `POST /patient/pay-copay`, but not the client-called `POST /insurance/payment-confirm` contract.`
### auth_ownership
- `26: The Insurance Payment Split feature is **P0 FIX/BLOCKED**. It must not be presented as a live payment path until the frontend uses a documented server-owned copay/payment contract, including ownership, approved-state checks, idempotency, an`
### state_transitions
- `3: ## Confirmed finding`
- `21: | Saved card selection | UI presents a card identifier but sends only an opaque `payment_method` value and no payment intent | No verifiable card/cash/copup payment execution contract exists in this path | **P0 FIX — create payment intent o`
- `22: | Redirect result | UI derives target screen from client `serviceType` and response fallback fields | A failed/malformed response can send the user to an unrelated success/tracking route | **FIX — return canonical entity kind/id/state from `
- `26: The Insurance Payment Split feature is **P0 FIX/BLOCKED**. It must not be presented as a live payment path until the frontend uses a documented server-owned copay/payment contract, including ownership, approved-state checks, idempotency, an`
### payment_insurance_relevance
- `1: # Phase 2 Patient — insurance payment split missing Backend contract`
- `5: `app/insurance/payment-split.tsx` calls:`
- `8: POST /insurance/payment-confirm`
- `11: with client-computed service total, patient share, company share, and a selected payment method. A source-wide Backend search found **no `payment-confirm` route** in the authoritative Backend tree.`
- `13: The current backend insurance flow exposes request/coverage/coplay mechanisms, including the alias `POST /patient/pay-copay`, but not the client-called `POST /insurance/payment-confirm` contract.`
- `19: | Confirmation call | The Patient payment-split flow fails at the final API call | **P0 FIX — replace route with a documented, server-owned flow; do not add a permissive endpoint that trusts client totals** |`
- `20: | Payment amounts | UI derives total, company share, and patient share from route parameters plus coverage response | Client can present/submit a split not bound to a real owned booking or insurance request | **P0 FIX — load server-owned re`
- `21: | Saved card selection | UI presents a card identifier but sends only an opaque `payment_method` value and no payment intent | No verifiable card/cash/copup payment execution contract exists in this path | **P0 FIX — create payment intent o`
- `26: The Insurance Payment Split feature is **P0 FIX/BLOCKED**. It must not be presented as a live payment path until the frontend uses a documented server-owned copay/payment contract, including ownership, approved-state checks, idempotency, an`
### error_empty_loading_retry_cancel
- `22: | Redirect result | UI derives target screen from client `serviceType` and response fallback fields | A failed/malformed response can send the user to an unrelated success/tracking route | **FIX — return canonical entity kind/id/state from `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
