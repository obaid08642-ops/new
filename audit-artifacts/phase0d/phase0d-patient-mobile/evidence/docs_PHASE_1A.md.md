# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `docs/PHASE_1A.md`
- **Member SHA-256:** `51342f0b9b31666295737f99ef74c25e72d5020d66c46dcfbfdb769744bba84a`
- **Line count:** 72
- **Read range:** `1-72`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `45: - Expo Router configuration.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `14: 4. Implement a remote Theme Engine (colors, radii, fonts, assets) controlled by Admin.`
- `21: 11. Setup Permissions manager.`
- `39: - Core Services (Http, Error, Logger, Analytics, FeatureFlags, Permissions).`
- `50: **Batch 5: Offline + Notifications + Permissions** ⏳ Pending`
### state_transitions
- `3: **Status:** 🟡 In Progress`
- `12: 2. Separate UI, Business Logic, Services, API Layer, State, etc.`
- `17: 7. Centralize error handling (AppError, ErrorBoundary).`
- `39: - Core Services (Http, Error, Logger, Analytics, FeatureFlags, Permissions).`
- `43: **Batch 2: Localization + Navigation** ⏳ Pending`
- `48: **Batch 3: Auth + Security** ⏳ Pending`
- `49: **Batch 4: Networking + State** ⏳ Pending`
- `50: **Batch 5: Offline + Notifications + Permissions** ⏳ Pending`
- `51: **Batch 6: Services** ⏳ Pending`
- `52: **Batch 7: Platform Features** ⏳ Pending`
- `53: **Batch 8: DX + Quality** ⏳ Pending`
- `57: 1. ✅ Project builds successfully`
### payment_insurance_relevance
- `8: Phase 1A is **strictly for reusable infrastructure**. NO business features (Pharmacy, Doctors, Labs, Orders, Chat, Payments) are implemented in this phase.`
### error_empty_loading_retry_cancel
- `16: 6. Centralize and abstract API client (HttpClient) with retries, timeout, cache.`
- `17: 7. Centralize error handling (AppError, ErrorBoundary).`
- `39: - Core Services (Http, Error, Logger, Analytics, FeatureFlags, Permissions).`
- `43: **Batch 2: Localization + Navigation** ⏳ Pending`
- `48: **Batch 3: Auth + Security** ⏳ Pending`
- `49: **Batch 4: Networking + State** ⏳ Pending`
- `50: **Batch 5: Offline + Notifications + Permissions** ⏳ Pending`
- `51: **Batch 6: Services** ⏳ Pending`
- `52: **Batch 7: Platform Features** ⏳ Pending`
- `53: **Batch 8: DX + Quality** ⏳ Pending`
- `58: 2. ✅ No TypeScript errors`
- `59: 3. ✅ No ESLint errors`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
