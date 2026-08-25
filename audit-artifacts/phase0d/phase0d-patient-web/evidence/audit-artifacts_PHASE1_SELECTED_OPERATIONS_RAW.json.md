# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE1_SELECTED_OPERATIONS_RAW.json`
- **Member SHA-256:** `25fff4a2c4eddc8decd039cf37df9b5ed94a62c6783f114f7ee7f39b63687357`
- **Line count:** 327
- **Read range:** `1-327`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `103: "/api/v1/orders/{id}/cancel": {`
- `105: "operationId": "OrdersController_cancel_v1",`
- `198: "/api/v1/cart/checkout": {`
- `241: "name": "page",`
### backend_consumers_or_contracts
- `2: "/api/v1/orders": {`
- `33: "/api/v1/orders/mine": {`
- `56: "/api/v1/orders/{id}": {`
- `79: "/api/v1/orders/create": {`
- `103: "/api/v1/orders/{id}/cancel": {`
- `126: "/api/v1/cart": {`
- `140: "/api/v1/cart/lines": {`
- `154: "/api/v1/cart/lines/{lineId}": {`
- `198: "/api/v1/cart/checkout": {`
- `212: "/api/v1/medicines": {`
- `283: "/api/v1/medicines/{id}": {`
### auth_ownership
- `265: "name": "authorization",`
### state_transitions
- `7: "name": "state",`
- `103: "/api/v1/orders/{id}/cancel": {`
- `105: "operationId": "OrdersController_cancel_v1",`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `103: "/api/v1/orders/{id}/cancel": {`
- `105: "operationId": "OrdersController_cancel_v1",`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
