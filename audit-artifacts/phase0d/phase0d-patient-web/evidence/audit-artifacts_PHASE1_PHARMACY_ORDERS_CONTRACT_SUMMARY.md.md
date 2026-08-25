# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE1_PHARMACY_ORDERS_CONTRACT_SUMMARY.md`
- **Member SHA-256:** `b853754c2a50d534ee48d79193041e0d7e74be1b60f9e203b6ab90e35c29ce47`
- **Line count:** 219
- **Read range:** `1-219`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `43: ## POST /api/v1/orders/{id}/cancel`
- `44: - summary: OrdersController_cancel_v1`
- `45: - operationId: OrdersController_cancel_v1`
- `100: ## GET /api/v1/cart/checkout`
- `126: - page (query, required=True, type=string)`
- `194: ## POST /api/v1/prescriptions/upload`
- `195: - summary: PrescriptionsController_upload_v1`
- `196: - operationId: PrescriptionsController_upload_v1`
- `212: ## POST /api/v1/media/upload`
- `213: - summary: MediaController_uploadFile_v1`
- `214: - operationId: MediaController_uploadFile_v1`
### backend_consumers_or_contracts
- `1: # Pharmacy/Orders Contract Detail Summary`
- `3: ## GET /api/v1/orders`
- `14: ## GET /api/v1/orders/mine`
- `24: ## GET /api/v1/orders/{id}`
- `34: ## POST /api/v1/orders/create`
- `43: ## POST /api/v1/orders/{id}/cancel`
- `53: ## GET /api/v1/cart`
- `62: ## POST /api/v1/cart/lines`
- `71: ## PATCH /api/v1/cart/lines/{lineId}`
- `81: ## DELETE /api/v1/cart/lines/{lineId}`
- `91: ## POST /api/v1/cart/clear`
- `100: ## GET /api/v1/cart/checkout`
### auth_ownership
- `6: - security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}`
- `17: - security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}`
- `27: - security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}`
- `37: - security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}`
- `46: - security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}`
- `56: - security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}`
- `65: - security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}`
- `74: - security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}`
- `84: - security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}`
- `94: - security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}`
- `103: - security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}`
- `112: - security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}`
### state_transitions
- `8: - state (query, required=True, type=string)`
- `43: ## POST /api/v1/orders/{id}/cancel`
- `44: - summary: OrdersController_cancel_v1`
- `45: - operationId: OrdersController_cancel_v1`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `43: ## POST /api/v1/orders/{id}/cancel`
- `44: - summary: OrdersController_cancel_v1`
- `45: - operationId: OrdersController_cancel_v1`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
