# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_L_INSURANCE_COPAY_INTEGRITY_20260819.md`
- **Member SHA-256:** `cb86d489e6eb898fd3d1ae069371d8c24a1a365a17661c95641a087d61090f8c`
- **Line count:** 32
- **Read range:** `1-32`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The confirmed Phase 5 contract gaps allowed an insurance request to accept client-supplied provider, booking context and price, and allowed `COPAY_PENDING` to become `COPAY_PAID` solely from a client-supplied payment identifier. This batch `
- `11: | Insurance request creation | A request now requires a canonical booking ID/kind owned by the authenticated patient. Backend loads the booking and derives provider assignment, price, service type and channel from that persisted record; cli`
- `12: | Active request duplicate | A current request for the same patient/booking/kind in an active review/approval/copay state is returned instead of creating a parallel request. |`
- `13: | Copay manual settlement | `COPAY_PENDING` accepts only a transaction ID that belongs to the request patient, has `booking_kind=insurance`, the same request ID as booking, `status=paid`, and exactly matches the stored `copay_amount`. Unmat`
- `15: | Patient UX | The insurance copay screen now opens the hosted payment processing route after intent creation. It no longer calls `/patient/pay-copay` and locally reports a service as paid from a client-held transaction ID. |`
- `21: | Insurance-flow regression | **PASS** — 1 suite, 46 tests. New coverage proves server-derived provider/price and rejects nonmatching client payment IDs; existing decision/refund/quote coverage remains green. |`
- `28: | Branch upload | **PASS** — source commit `69d6b56` (`fix: bind insurance copay to verified payment`) is on `manus/on-live-reconciliation`. |`
- `32: The public quote preview endpoint remains an informational eligibility/payment-method view and must not be used as a financial authorization. Full production acceptance still requires an owner-approved, live-configured payment provider; no `
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `32: The public quote preview endpoint remains an informational eligibility/payment-method view and must not be used as a financial authorization. Full production acceptance still requires an owner-approved, live-configured payment provider; no `
### state_transitions
- `5: The confirmed Phase 5 contract gaps allowed an insurance request to accept client-supplied provider, booking context and price, and allowed `COPAY_PENDING` to become `COPAY_PAID` solely from a client-supplied payment identifier. This batch `
- `12: | Active request duplicate | A current request for the same patient/booking/kind in an active review/approval/copay state is returned instead of creating a parallel request. |`
- `13: | Copay manual settlement | `COPAY_PENDING` accepts only a transaction ID that belongs to the request patient, has `booking_kind=insurance`, the same request ID as booking, `status=paid`, and exactly matches the stored `copay_amount`. Unmat`
- `14: | Standard settlement path | A verified `payment.completed` event can settle a matching `COPAY_PENDING` request from the persisted payment transaction. |`
- `21: | Insurance-flow regression | **PASS** — 1 suite, 46 tests. New coverage proves server-derived provider/price and rejects nonmatching client payment IDs; existing decision/refund/quote coverage remains green. |`
- `32: The public quote preview endpoint remains an informational eligibility/payment-method view and must not be used as a financial authorization. Full production acceptance still requires an owner-approved, live-configured payment provider; no `
### payment_insurance_relevance
- `1: # Phase 8 — Batch L: insurance request and copay integrity`
- `5: The confirmed Phase 5 contract gaps allowed an insurance request to accept client-supplied provider, booking context and price, and allowed `COPAY_PENDING` to become `COPAY_PAID` solely from a client-supplied payment identifier. This batch `
- `11: | Insurance request creation | A request now requires a canonical booking ID/kind owned by the authenticated patient. Backend loads the booking and derives provider assignment, price, service type and channel from that persisted record; cli`
- `12: | Active request duplicate | A current request for the same patient/booking/kind in an active review/approval/copay state is returned instead of creating a parallel request. |`
- `13: | Copay manual settlement | `COPAY_PENDING` accepts only a transaction ID that belongs to the request patient, has `booking_kind=insurance`, the same request ID as booking, `status=paid`, and exactly matches the stored `copay_amount`. Unmat`
- `14: | Standard settlement path | A verified `payment.completed` event can settle a matching `COPAY_PENDING` request from the persisted payment transaction. |`
- `15: | Patient UX | The insurance copay screen now opens the hosted payment processing route after intent creation. It no longer calls `/patient/pay-copay` and locally reports a service as paid from a client-held transaction ID. |`
- `21: | Insurance-flow regression | **PASS** — 1 suite, 46 tests. New coverage proves server-derived provider/price and rejects nonmatching client payment IDs; existing decision/refund/quote coverage remains green. |`
- `28: | Branch upload | **PASS** — source commit `69d6b56` (`fix: bind insurance copay to verified payment`) is on `manus/on-live-reconciliation`. |`
- `32: The public quote preview endpoint remains an informational eligibility/payment-method view and must not be used as a financial authorization. Full production acceptance still requires an owner-approved, live-configured payment provider; no `
### error_empty_loading_retry_cancel
- `5: The confirmed Phase 5 contract gaps allowed an insurance request to accept client-supplied provider, booking context and price, and allowed `COPAY_PENDING` to become `COPAY_PAID` solely from a client-supplied payment identifier. This batch `
- `13: | Copay manual settlement | `COPAY_PENDING` accepts only a transaction ID that belongs to the request patient, has `booking_kind=insurance`, the same request ID as booking, `status=paid`, and exactly matches the stored `copay_amount`. Unmat`
- `14: | Standard settlement path | A verified `payment.completed` event can settle a matching `COPAY_PENDING` request from the persisted payment transaction. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
