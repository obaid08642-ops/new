# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `docs/STORE_ARCHITECTURE.md`
- **Member SHA-256:** `37312d944089faef0be48492efcab105f570a786b3f8ff656e5efb9fde9d1ec6`
- **Line count:** 43
- **Read range:** `1-43`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: 1. **Dynamic Module Injection**: We do NOT statically import all reducers in `store/index.ts`. Instead, we use `ReducerManager` and `FeatureRegistry`. This allows future modules (Pharmacy, Doctors, Labs) to register their own Reducers, Midd`
- `43: 4. Use the `FeatureRegistry.register()` inside the Module's entry point to inject it into the store.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `10: - Highly sensitive data (like the `auth` slice tokens) are **blacklisted** and managed securely via Expo SecureStore.`
### state_transitions
- `4: The state management architecture for Nabdah Plus is built using **Redux Toolkit (RTK)** and **RTK Query**.`
- `8: 1. **Dynamic Module Injection**: We do NOT statically import all reducers in `store/index.ts`. Instead, we use `ReducerManager` and `FeatureRegistry`. This allows future modules (Pharmacy, Doctors, Labs) to register their own Reducers, Midd`
- `13: - On `STORE/RESET_ALL`, the Redux state is wiped, `persistor.purge()` is explicitly called, and the RTK Query cache is cleared, leaving zero traces.`
- `36: [ New State ] --> [ Component Re-renders via reselect Memoization ]`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `5: It strictly adheres to performance, modularity, and offline-first principles.`
- `8: 1. **Dynamic Module Injection**: We do NOT statically import all reducers in `store/index.ts`. Instead, we use `ReducerManager` and `FeatureRegistry`. This allows future modules (Pharmacy, Doctors, Labs) to register their own Reducers, Midd`
- `15: 4. **Offline First Mutations**: Handled through `HttpClient.ts` offline queues. Features deduplication locks, UUIDs, `X-Idempotency-Key` headers, `X-Correlation-ID` headers, and a `Conflict Resolution Hook`.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
