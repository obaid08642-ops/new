# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_DIRECT_COMPONENT_INVENTORY_20260818.txt`
- **Member SHA-256:** `a6a939328fdcebf1593d47e15a72fae698d4188df008e1d2e2e296b8ab7adc12`
- **Line count:** 582
- **Read range:** `1-582`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: backend/infra/fastapi/ai_routes.py`
- `105: backend/src/modules/booking-flow/booking-flow.module.ts`
- `106: backend/src/modules/booking-ops/booking-ops.module.ts`
- `197: backend/src/modules/home-care/repositories/homecarebooking.repository.ts`
- `201: backend/src/modules/home-care/schemas/home-care-booking.schema.ts`
- `236: patient-app/app/(auth)/login.tsx`
- `240: patient-app/app/(auth)/register.tsx`
- `270: patient-app/app/consultations/booking-confirm.tsx`
- `271: patient-app/app/consultations/booking-success.tsx`
- `273: patient-app/app/consultations/cancel-reschedule.tsx`
- `293: patient-app/app/diagnostics/book-sample.tsx`
- `294: patient-app/app/diagnostics/booking-confirm.tsx`
### backend_consumers_or_contracts
- `13: backend/infra/fastapi/ai_routes.py`
- `14: backend/infra/fastapi/ai_service.py`
- `15: backend/infra/fastapi/import_etl_products.py`
- `16: backend/infra/fastapi/nestjs_proxy.py`
- `17: backend/infra/fastapi/requirements.txt`
- `18: backend/infra/fastapi/seed_data.py`
- `19: backend/infra/fastapi/server.py`
- `20: backend/infra/fastapi/setup_server.sh`
- `21: backend/infra/fastapi/tests/conftest.py`
- `22: backend/infra/fastapi/tests/test_nabd_backend.py`
- `39: backend/src/common/auth.guard.spec.ts`
- `40: backend/src/common/auth.guard.ts`
### auth_ownership
- `50: backend/src/common/permissions.ts`
- `60: backend/src/modules/admin-authority/admin-authority.module.ts`
- `61: backend/src/modules/admin-command-center/admin-command-center.module.ts`
- `62: backend/src/modules/admin-governance/admin-governance.module.ts`
- `63: backend/src/modules/admin-governance/b2b.controller.ts`
- `64: backend/src/modules/admin-governance/system-config.controller.ts`
- `65: backend/src/modules/admin-web-core/admin-web-core.module.ts`
- `66: backend/src/modules/admin-web-core/controllers/admin-config.controller.ts`
- `67: backend/src/modules/admin-web-core/controllers/admin-extended-operations.controller.ts`
- `68: backend/src/modules/admin-web-core/controllers/admin-governance.controller.ts`
- `69: backend/src/modules/admin-web-core/controllers/analytics.controller.ts`
- `70: backend/src/modules/admin-web-core/controllers/finance.controller.ts`
### state_transitions
- `271: patient-app/app/consultations/booking-success.tsx`
- `273: patient-app/app/consultations/cancel-reschedule.tsx`
- `295: patient-app/app/diagnostics/booking-success.tsx`
- `358: patient-app/app/insurance/approval-pending.tsx`
- `368: patient-app/app/insurance/refund-status.tsx`
- `409: patient-app/app/payments/failed.tsx`
- `412: patient-app/app/payments/success.tsx`
- `414: patient-app/app/pharmacy/broadcast-status.tsx`
- `490: provider-app/src/components/SuccessScreen.tsx`
- `496: provider-app/src/screens/auth/PendingDashboard.tsx`
- `532: provider-app/src/screens/shared/RegistrationSuccess.tsx`
### payment_insurance_relevance
- `217: backend/src/modules/insurance/insurance.controller.ts`
- `218: backend/src/modules/insurance/insurance.module.ts`
- `219: backend/src/modules/insurance/insurance.service.spec.ts`
- `283: patient-app/app/consultations/offer/[id].tsx`
- `298: patient-app/app/diagnostics/insurance-approval.tsx`
- `299: patient-app/app/diagnostics/insurance-upload.tsx`
- `357: patient-app/app/insurance/add-policy.tsx`
- `358: patient-app/app/insurance/approval-pending.tsx`
- `359: patient-app/app/insurance/benefits-summary.tsx`
- `360: patient-app/app/insurance/claim-tracking.tsx`
- `361: patient-app/app/insurance/copay.tsx`
- `362: patient-app/app/insurance/coverage-check.tsx`
### error_empty_loading_retry_cancel
- `273: patient-app/app/consultations/cancel-reschedule.tsx`
- `358: patient-app/app/insurance/approval-pending.tsx`
- `409: patient-app/app/payments/failed.tsx`
- `496: provider-app/src/screens/auth/PendingDashboard.tsx`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
