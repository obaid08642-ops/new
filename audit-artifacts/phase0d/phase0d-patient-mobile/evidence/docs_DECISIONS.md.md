# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `docs/DECISIONS.md`
- **Member SHA-256:** `7e0ddf2138e0776bf01fc85f6685bd94c4bcb82fea3ddbb1a58c94d67b681edc`
- **Line count:** 139
- **Read range:** `1-139`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `58: **Decision:** Defined `Repository<T>`, `LocalDataSource<T>`, and `RemoteDataSource<T>`. Screens only talk to repositories.`
- `137: **Context:** Offline queues can accidentally submit the same POST/PATCH request multiple times when network drops repeatedly.`
### backend_consumers_or_contracts
- `17: **Consequences:** Prevents deep imports (e.g., `import { X } from '@/modules/pharmacy/components/X'`). Enforces encapsulation.`
### auth_ownership
- `9: **Decision:** All core UI components (Button, Text, Card, etc.) live strictly in `src/design-system/`. They consume central tokens. Feature modules import from `@/design-system` barrel export.`
- `36: **Context:** Need centralized logic for retries, timeouts, caching, and token injection.`
- `68: ## ADR-010: Admin-configurable ThemeEngine`
- `72: **Decision:** `ThemeEngine` fetches remote config and overrides base Design System tokens at runtime.`
- `75: ## ADR-011: Centralized PermissionsManager`
- `78: **Context:** OS permission requests are scattered and handle rejections poorly.`
- `79: **Decision:** Built `PermissionsManager` as a single access point with fallback to OS Settings.`
- `80: **Consequences:** Consistent UX for permission requests across all features.`
### state_transitions
- `7: **Status:** Accepted`
- `14: **Status:** Accepted`
- `21: **Status:** Accepted`
- `28: **Status:** Accepted`
- `29: **Context:** Prevent runtime errors and ensure code quality.`
- `35: **Status:** Accepted`
- `42: **Status:** Accepted`
- `49: **Status:** Accepted`
- `56: **Status:** Accepted`
- `57: **Context:** Need to decouple data access (local + remote) from UI and State logic.`
- `63: **Status:** Accepted`
- `70: **Status:** Accepted`
### payment_insurance_relevance
- `9: **Decision:** All core UI components (Button, Text, Card, etc.) live strictly in `src/design-system/`. They consume central tokens. Feature modules import from `@/design-system` barrel export.`
### error_empty_loading_retry_cancel
- `29: **Context:** Prevent runtime errors and ensure code quality.`
- `36: **Context:** Need centralized logic for retries, timeouts, caching, and token injection.`
- `37: **Decision:** Built `HttpClient.ts` with interceptors and offline queue. No direct `fetch` calls allowed in feature modules.`
- `52: **Consequences:** Graceful fallback if offline. Deterministic bucketing based on hashed user IDs.`
- `59: **Consequences:** Easy offline-first implementation. UI doesn't care if data comes from API or SQLite.`
- `82: ## ADR-012: Error handling via AppError class + tryCatch`
- `85: **Context:** Try/catch blocks are verbose and often lose type safety.`
- `86: **Decision:** Adopted an `AppError` class and a tuple-returning `tryCatch` helper function (similar to Go).`
- `87: **Consequences:** Forces developers to handle errors explicitly. Standardizes user-facing error messages in Arabic.`
- `92: **Context:** Need robust offline state recovery.`
- `137: **Context:** Offline queues can accidentally submit the same POST/PATCH request multiple times when network drops repeatedly.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
