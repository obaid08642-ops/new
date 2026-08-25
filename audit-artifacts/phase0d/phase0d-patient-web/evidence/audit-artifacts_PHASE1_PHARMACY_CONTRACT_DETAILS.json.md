# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE1_PHARMACY_CONTRACT_DETAILS.json`
- **Member SHA-256:** `8dda2db059c0b27dd09710008b2796955c92d972f45d5f9977742d5dc4801e6d`
- **Line count:** 503
- **Read range:** `1-503`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `111: "/api/v1/orders/{id}/cancel": {`
- `113: "operationId": "OrdersController_cancel_v1",`
- `220: "/api/v1/cart/checkout": {`
- `277: "name": "page",`
- `450: "/api/v1/prescriptions/upload": {`
- `452: "operationId": "PrescriptionsController_upload_v1",`
- `478: "/api/v1/media/upload": {`
- `480: "operationId": "MediaController_uploadFile_v1",`
- `498: "RadiologyUploadReportDto": {`
### backend_consumers_or_contracts
- `10: "/api/v1/orders": {`
- `41: "/api/v1/orders/mine": {`
- `64: "/api/v1/orders/{id}": {`
- `87: "/api/v1/orders/create": {`
- `111: "/api/v1/orders/{id}/cancel": {`
- `134: "/api/v1/cart": {`
- `148: "/api/v1/cart/lines": {`
- `162: "/api/v1/cart/lines/{lineId}": {`
- `206: "/api/v1/cart/clear": {`
- `220: "/api/v1/cart/checkout": {`
- `234: "/api/v1/cart/prescription": {`
- `248: "/api/v1/medicines": {`
### auth_ownership
- `3: "bearer": {`
- `4: "scheme": "bearer",`
- `5: "bearerFormat": "JWT",`
- `301: "name": "authorization",`
- `376: "name": "authorization",`
### state_transitions
- `15: "name": "state",`
- `111: "/api/v1/orders/{id}/cancel": {`
- `113: "operationId": "OrdersController_cancel_v1",`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `111: "/api/v1/orders/{id}/cancel": {`
- `113: "operationId": "OrdersController_cancel_v1",`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
