# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_T_INSURANCE_COPAY_INTEGRITY_20260819.md`
- **Member SHA-256:** `f11dc3d700663162ede76ccfd77b5336c7fe4d9bc22d5aacbaec8da377d92905`
- **Line count:** 33
- **Read range:** `1-33`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The Patient insurance payment-split screen computed coverage and patient/company shares from route parameters and a generic coverage check, then posted those client-derived values to `/insurance/payment-confirm` without the authoritative in`
- `11: | Consultation insurance booking | After the server creates the appointment, the app creates an insurance request with only the owned appointment ID and `consultation` kind. It navigates to the insurance request summary instead of auto-conf`
- `12: | Request-bound summary | Payment split now requires `request_id`, reads `/insurance/requests/:id`, and accepts only a valid owned server request containing booking identity, state, price, and copay. It no longer trusts route amount, servic`
- `13: | Decision gate | Provider review is rendered as a non-payable waiting state; partial approval opens the existing idempotent payment-intent route for `insurance/<request-id>`; full approval submits only the request ID to the canonical copay`
- `14: | Client payment safety | The checkout transition carries the server intent ID, server checkout URL, request ID and server amount. No transaction ID, payment success, appointment confirmation, or financial share is manufactured in the clien`
- `16: | Regression coverage | A pure contract test covers request shape validation, provider-review blocking, checkout eligibility, and invalid/missing request data. |`
- `28: | Existing Backend authority | **Confirmed source contract** — `InsuranceFlowService` checks request ownership, requires `COPAY_PENDING` plus a paid matching transaction for non-zero copay, and settles verified checkout events fail-closed. `
- `29: | Branch upload | **PASS** — source commit `edc625c` (`fix: bind insurance copay to owned request`) is on `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- `5: The Patient insurance payment-split screen computed coverage and patient/company shares from route parameters and a generic coverage check, then posted those client-derived values to `/insurance/payment-confirm` without the authoritative in`
- `12: | Request-bound summary | Payment split now requires `request_id`, reads `/insurance/requests/:id`, and accepts only a valid owned server request containing booking identity, state, price, and copay. It no longer trusts route amount, servic`
### auth_ownership
- `28: | Existing Backend authority | **Confirmed source contract** — `InsuranceFlowService` checks request ownership, requires `COPAY_PENDING` plus a paid matching transaction for non-zero copay, and settles verified checkout events fail-closed. `
### state_transitions
- `5: The Patient insurance payment-split screen computed coverage and patient/company shares from route parameters and a generic coverage check, then posted those client-derived values to `/insurance/payment-confirm` without the authoritative in`
- `12: | Request-bound summary | Payment split now requires `request_id`, reads `/insurance/requests/:id`, and accepts only a valid owned server request containing booking identity, state, price, and copay. It no longer trusts route amount, servic`
- `13: | Decision gate | Provider review is rendered as a non-payable waiting state; partial approval opens the existing idempotent payment-intent route for `insurance/<request-id>`; full approval submits only the request ID to the canonical copay`
- `14: | Client payment safety | The checkout transition carries the server intent ID, server checkout URL, request ID and server amount. No transaction ID, payment success, appointment confirmation, or financial share is manufactured in the clien`
- `15: | Appointment detail | The old `/patient/pay-copay` call with the appointment ID and immediate local `CONFIRMED` mutation was removed. The user first resolves a matching active insurance request and then opens its reviewed server state. |`
- `28: | Existing Backend authority | **Confirmed source contract** — `InsuranceFlowService` checks request ownership, requires `COPAY_PENDING` plus a paid matching transaction for non-zero copay, and settles verified checkout events fail-closed. `
- `33: No payment intent, policy, insurance request, appointment, or other production record was created or changed. Real card payment is still deferred pending Moyasar activation. Phase 11 must verify an owned sandbox appointment through request `
### payment_insurance_relevance
- `1: # Phase 8 — Batch T: insurance copay and payment-split integrity`
- `5: The Patient insurance payment-split screen computed coverage and patient/company shares from route parameters and a generic coverage check, then posted those client-derived values to `/insurance/payment-confirm` without the authoritative in`
- `11: | Consultation insurance booking | After the server creates the appointment, the app creates an insurance request with only the owned appointment ID and `consultation` kind. It navigates to the insurance request summary instead of auto-conf`
- `12: | Request-bound summary | Payment split now requires `request_id`, reads `/insurance/requests/:id`, and accepts only a valid owned server request containing booking identity, state, price, and copay. It no longer trusts route amount, servic`
- `13: | Decision gate | Provider review is rendered as a non-payable waiting state; partial approval opens the existing idempotent payment-intent route for `insurance/<request-id>`; full approval submits only the request ID to the canonical copay`
- `14: | Client payment safety | The checkout transition carries the server intent ID, server checkout URL, request ID and server amount. No transaction ID, payment success, appointment confirmation, or financial share is manufactured in the clien`
- `15: | Appointment detail | The old `/patient/pay-copay` call with the appointment ID and immediate local `CONFIRMED` mutation was removed. The user first resolves a matching active insurance request and then opens its reviewed server state. |`
- `16: | Regression coverage | A pure contract test covers request shape validation, provider-review blocking, checkout eligibility, and invalid/missing request data. |`
- `22: | Focused Patient insurance copay contract | **PASS** — 2 tests. |`
- `28: | Existing Backend authority | **Confirmed source contract** — `InsuranceFlowService` checks request ownership, requires `COPAY_PENDING` plus a paid matching transaction for non-zero copay, and settles verified checkout events fail-closed. `
- `29: | Branch upload | **PASS** — source commit `edc625c` (`fix: bind insurance copay to owned request`) is on `manus/on-live-reconciliation`. |`
- `33: No payment intent, policy, insurance request, appointment, or other production record was created or changed. Real card payment is still deferred pending Moyasar activation. Phase 11 must verify an owned sandbox appointment through request `
### error_empty_loading_retry_cancel
- `28: | Existing Backend authority | **Confirmed source contract** — `InsuranceFlowService` checks request ownership, requires `COPAY_PENDING` plus a paid matching transaction for non-zero copay, and settles verified checkout events fail-closed. `
- `33: No payment intent, policy, insurance request, appointment, or other production record was created or changed. Real card payment is still deferred pending Moyasar activation. Phase 11 must verify an owned sandbox appointment through request `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
