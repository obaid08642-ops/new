# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `docs/FUTURE_ROADMAP.md`
- **Member SHA-256:** `76083856b79e78e2e7932529d1b61dd793870e772855cc263db499f46820d435`
- **Line count:** 67
- **Read range:** `1-67`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `15: - Expo Router setup with Auth/Guest/Admin guards.`
- `17: - Route lazy loading.`
- `31: - **TargetResolver:** Finding UI elements across screens.`
- `42: - **Pharmacy:** Med search, prescription upload, cart, orders.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `10: - Centralized services (HttpClient, Logger, Analytics, FeatureFlags, Permissions).`
- `15: - Expo Router setup with Auth/Guest/Admin guards.`
- `61: ## Parallel Track: Admin Dashboard`
### state_transitions
- `6: *Status: In Progress*`
- `17: - Route lazy loading.`
- `19: ### Phase 1C — Auth, State & Data Layer`
- `21: - Complete Redux state architecture setup.`
- `27: *Status: Planned (Guided Tour Phase 0 Architecture)*`
- `39: *Status: Planned*`
- `52: *Status: Planned*`
- `62: *Status: Planned*`
### payment_insurance_relevance
- `46: - **Payments:** Gateway integration, wallets, loyalty points.`
- `47: - **Insurance:** Approvals, copay calculations.`
### error_empty_loading_retry_cancel
- `17: - Route lazy loading.`
- `22: - Repository pattern full implementation (Offline-first data sync).`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
