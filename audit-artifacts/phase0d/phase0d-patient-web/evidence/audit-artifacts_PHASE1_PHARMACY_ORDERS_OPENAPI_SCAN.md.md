# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE1_PHARMACY_ORDERS_OPENAPI_SCAN.md`
- **Member SHA-256:** `b542818975ee2d5e91ca3e401ac352a5064af30f09f849c9ec85db840515e043`
- **Line count:** 265
- **Read range:** `1-265`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: - `POST /api/v1/admin/authority/orders/{id}/force-cancel` | tags=AdminAuthority | security=no | params=id | request=- | responses=201`
- `14: - `GET /api/v1/admin/finance-engine/fraud/duplicate-payments/{bookingId}` | tags=AdminFinanceEngine | security=no | params=bookingId | request=- | responses=200`
- `15: - `POST /api/v1/admin/finance-engine/refunds/{id}/execute` | tags=AdminFinanceEngine | security=no | params=id | request=- | responses=201`
- `16: - `GET /api/v1/admin/finance/refunds/queue` | tags=AdminFinanceCore | security=no | params=- | request=- | responses=200`
- `17: - `POST /api/v1/admin/finance/refunds/{id}/decide` | tags=AdminFinanceCore | security=no | params=id | request=- | responses=201`
- `34: - `GET /api/v1/admin/refunds` | tags=AdminRefunds | security=no | params=- | request=- | responses=200`
- `35: - `GET /api/v1/admin/refunds/pending` | tags=AdminRefunds | security=no | params=- | request=- | responses=200`
- `36: - `POST /api/v1/admin/refunds/{id}/decide` | tags=AdminRefunds | security=no | params=id | request=- | responses=201`
- `40: - `GET /api/v1/booking/flow/payment/{type}/{id}` | tags=BookingOps | security=no | params=type, id | request=- | responses=200`
- `41: - `POST /api/v1/booking/flow/payment/{type}/{id}/mark` | tags=BookingOps | security=no | params=type, id | request=- | responses=201`
- `43: - `GET /api/v1/cart/checkout` | tags=Cart | security=no | params=- | request=- | responses=200`
- `66: - `GET /api/v1/medicines` | tags=Medicines | security=no | params=search, q, category, page, limit, cursor, authorization | request=- | responses=200`
### backend_consumers_or_contracts
- `7: ## Pharmacy/Orders-related paths`
- `9: - `GET /api/v1/admin/analytics/top-medicines` | tags=AdminAnalytics | security=no | params=limit | request=- | responses=200`
- `10: - `POST /api/v1/admin/authority/orders/{id}/force-cancel` | tags=AdminAuthority | security=no | params=id | request=- | responses=201`
- `11: - `POST /api/v1/admin/authority/orders/{id}/force-complete` | tags=AdminAuthority | security=no | params=id | request=- | responses=201`
- `12: - `POST /api/v1/admin/authority/orders/{id}/force-reassign` | tags=AdminAuthority | security=no | params=id | request=- | responses=201`
- `13: - `GET /api/v1/admin/command-center/order/{kind}/{id}` | tags=AdminCommandCenter | security=no | params=kind, id | request=- | responses=200`
- `14: - `GET /api/v1/admin/finance-engine/fraud/duplicate-payments/{bookingId}` | tags=AdminFinanceEngine | security=no | params=bookingId | request=- | responses=200`
- `15: - `POST /api/v1/admin/finance-engine/refunds/{id}/execute` | tags=AdminFinanceEngine | security=no | params=id | request=- | responses=201`
- `16: - `GET /api/v1/admin/finance/refunds/queue` | tags=AdminFinanceCore | security=no | params=- | request=- | responses=200`
- `17: - `POST /api/v1/admin/finance/refunds/{id}/decide` | tags=AdminFinanceCore | security=no | params=id | request=- | responses=201`
- `18: - `POST /api/v1/admin/override/payment` | tags=AdminOverride | security=no | params=- | request=- | responses=201`
- `19: - `POST /api/v1/admin/pharmacy/broadcasts/expire-stale` | tags=AdminBroadcast | security=no | params=- | request=- | responses=201`
### auth_ownership
- `9: - `GET /api/v1/admin/analytics/top-medicines` | tags=AdminAnalytics | security=no | params=limit | request=- | responses=200`
- `10: - `POST /api/v1/admin/authority/orders/{id}/force-cancel` | tags=AdminAuthority | security=no | params=id | request=- | responses=201`
- `11: - `POST /api/v1/admin/authority/orders/{id}/force-complete` | tags=AdminAuthority | security=no | params=id | request=- | responses=201`
- `12: - `POST /api/v1/admin/authority/orders/{id}/force-reassign` | tags=AdminAuthority | security=no | params=id | request=- | responses=201`
- `13: - `GET /api/v1/admin/command-center/order/{kind}/{id}` | tags=AdminCommandCenter | security=no | params=kind, id | request=- | responses=200`
- `14: - `GET /api/v1/admin/finance-engine/fraud/duplicate-payments/{bookingId}` | tags=AdminFinanceEngine | security=no | params=bookingId | request=- | responses=200`
- `15: - `POST /api/v1/admin/finance-engine/refunds/{id}/execute` | tags=AdminFinanceEngine | security=no | params=id | request=- | responses=201`
- `16: - `GET /api/v1/admin/finance/refunds/queue` | tags=AdminFinanceCore | security=no | params=- | request=- | responses=200`
- `17: - `POST /api/v1/admin/finance/refunds/{id}/decide` | tags=AdminFinanceCore | security=no | params=id | request=- | responses=201`
- `18: - `POST /api/v1/admin/override/payment` | tags=AdminOverride | security=no | params=- | request=- | responses=201`
- `19: - `POST /api/v1/admin/pharmacy/broadcasts/expire-stale` | tags=AdminBroadcast | security=no | params=- | request=- | responses=201`
- `20: - `POST /api/v1/admin/pharmacy/broadcasts/{orderId}/advance` | tags=AdminBroadcast | security=no | params=orderId | request=- | responses=201`
### state_transitions
- `10: - `POST /api/v1/admin/authority/orders/{id}/force-cancel` | tags=AdminAuthority | security=no | params=id | request=- | responses=201`
- `15: - `POST /api/v1/admin/finance-engine/refunds/{id}/execute` | tags=AdminFinanceEngine | security=no | params=id | request=- | responses=201`
- `16: - `GET /api/v1/admin/finance/refunds/queue` | tags=AdminFinanceCore | security=no | params=- | request=- | responses=200`
- `17: - `POST /api/v1/admin/finance/refunds/{id}/decide` | tags=AdminFinanceCore | security=no | params=id | request=- | responses=201`
- `26: - `GET /api/v1/admin/pharmacy/shortage-flags` | tags=AdminShortage | security=no | params=status | request=- | responses=200`
- `34: - `GET /api/v1/admin/refunds` | tags=AdminRefunds | security=no | params=- | request=- | responses=200`
- `35: - `GET /api/v1/admin/refunds/pending` | tags=AdminRefunds | security=no | params=- | request=- | responses=200`
- `36: - `POST /api/v1/admin/refunds/{id}/decide` | tags=AdminRefunds | security=no | params=id | request=- | responses=201`
- `74: - `GET /api/v1/medicines/admin/change-requests` | tags=Medicines | security=no | params=status, type, page, limit | request=- | responses=200`
- `78: - `GET /api/v1/medicines/admin/image-suggestions` | tags=Medicines | security=no | params=status, page, limit | request=- | responses=200`
- `83: - `GET /api/v1/medicines/admin/pending-review` | tags=Medicines | security=no | params=- | request=- | responses=200`
- `85: - `GET /api/v1/medicines/admin/shortage-reports` | tags=Medicines | security=no | params=status, page, limit | request=- | responses=200`
### payment_insurance_relevance
- `5: Total path objects: 1234`
- `14: - `GET /api/v1/admin/finance-engine/fraud/duplicate-payments/{bookingId}` | tags=AdminFinanceEngine | security=no | params=bookingId | request=- | responses=200`
- `15: - `POST /api/v1/admin/finance-engine/refunds/{id}/execute` | tags=AdminFinanceEngine | security=no | params=id | request=- | responses=201`
- `16: - `GET /api/v1/admin/finance/refunds/queue` | tags=AdminFinanceCore | security=no | params=- | request=- | responses=200`
- `17: - `POST /api/v1/admin/finance/refunds/{id}/decide` | tags=AdminFinanceCore | security=no | params=id | request=- | responses=201`
- `18: - `POST /api/v1/admin/override/payment` | tags=AdminOverride | security=no | params=- | request=- | responses=201`
- `34: - `GET /api/v1/admin/refunds` | tags=AdminRefunds | security=no | params=- | request=- | responses=200`
- `35: - `GET /api/v1/admin/refunds/pending` | tags=AdminRefunds | security=no | params=- | request=- | responses=200`
- `36: - `POST /api/v1/admin/refunds/{id}/decide` | tags=AdminRefunds | security=no | params=id | request=- | responses=201`
- `40: - `GET /api/v1/booking/flow/payment/{type}/{id}` | tags=BookingOps | security=no | params=type, id | request=- | responses=200`
- `41: - `POST /api/v1/booking/flow/payment/{type}/{id}/mark` | tags=BookingOps | security=no | params=type, id | request=- | responses=201`
- `65: - `POST /api/v1/insurance/payment-confirm` | tags=InsuranceFlow | security=no | params=- | request=- | responses=201`
### error_empty_loading_retry_cancel
- `10: - `POST /api/v1/admin/authority/orders/{id}/force-cancel` | tags=AdminAuthority | security=no | params=id | request=- | responses=201`
- `35: - `GET /api/v1/admin/refunds/pending` | tags=AdminRefunds | security=no | params=- | request=- | responses=200`
- `83: - `GET /api/v1/medicines/admin/pending-review` | tags=Medicines | security=no | params=- | request=- | responses=200`
- `132: - `POST /api/v1/orders/{id}/cancel` | tags=Orders | security=no | params=id | request=- | responses=201`
- `154: - `POST /api/v1/patient/pharmacy/orders/{id}/cancel` | tags=PatientPharmacy | security=no | params=id | request=- | responses=201`
- `161: - `POST /api/v1/payments/retry/{type}/{id}` | tags=Payments | security=no | params=type, id, idempotency-key | request=- | responses=201`
- `227: - `POST /api/v1/provider/pharmacy/allocations/{id}/cancel` | tags=ProviderPharmacy | security=no | params=id | request=- | responses=201`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
