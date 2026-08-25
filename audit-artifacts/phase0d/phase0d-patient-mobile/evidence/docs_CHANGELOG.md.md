# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `docs/CHANGELOG.md`
- **Member SHA-256:** `92699c5465a3b7838318eabe9a576aeecde8fe3b4db2b4bd88c7cc55d7d51f88`
- **Line count:** 128
- **Read range:** `1-128`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: - Sync Engine (Batch 6): Implemented `SyncManager`, `SyncWorker`, `QueueProcessor`, `RetryScheduler` (Exponential Backoff), and `BackgroundSynchronizer`.`
- `42: - `src/core/platform/auth/AuthAuditLogger.ts`: Specialized audit logger for capturing authentication success, failure, and logout events.`
- `48: - `src/core/platform/auth/AccountLockoutService.ts`: Lockout system after repeated failed login attempts.`
- `68: - `src/core/platform/business/FavoritesManager.ts`: Bookmarking platform for doctors, pharmacies, and products.`
- `83: - `src/core/platform/media/MediaManager.ts`: Centralized file upload, compression, and secure URL manager.`
- `100: - src/services/HttpClient.ts — Centralized HTTP client (retry, cache, offline queue, interceptors, pagination, ssl pinning prep)`
- `106: - src/services/FileManager.ts — Centralized cache clearing, downloads, and multipart uploads`
- `111: - src/navigation/ — AuthGuard, AdminGuard, DeepLinking, and Expo Router config`
- `125: - Basic screens (Home, Pharmacy, Consultations, Diagnostics, Nursing).`
### backend_consumers_or_contracts
- `41: - `src/core/platform/auth/BiometricService.ts`: Native biometric authentication integration (FaceID/TouchID) using expo-local-authentication.`
- `42: - `src/core/platform/auth/AuthAuditLogger.ts`: Specialized audit logger for capturing authentication success, failure, and logout events.`
- `43: - `src/core/platform/auth/AppLockService.ts`: Background inactivity tracker to enforce session timeout and automatic app locking.`
- `47: - `src/core/platform/auth/PasswordPolicyService.ts`: Centralized password rules validation.`
- `48: - `src/core/platform/auth/AccountLockoutService.ts`: Lockout system after repeated failed login attempts.`
- `49: - `src/core/platform/auth/AuthProviders.ts`: Abstract interfaces and stubs for Google, Apple, and Email auth providers.`
- `53: - `src/core/platform/auth/AuthStateMachine.ts`: Explicit state machine managing transitions (Authenticating, Locked, Expired).`
- `54: - `src/core/platform/auth/DeviceTracker.ts`: Abstracted device registration and unique persistent ID generation.`
- `55: - `src/core/platform/auth/SessionManager.ts`: Session handling with multi-device tracking, remote revocation, and refresh token rotation.`
- `84: - `src/core/platform/realtime/RealtimeClient.ts`: WebSocket abstraction for presence, subscriptions, and auto-reconnect.`
- `107: - src/services/Notifications.ts — Local and Push notification abstraction`
- `108: - src/services/auth/ — AuthManager and AuthInterceptor`
### auth_ownership
- `32: - Unit tests added for Auth modules (`SessionManager`, `AccountLockoutService`, `PasswordPolicyService`).`
- `33: - `IAuthProvider` extended with comprehensive methods (`signIn`, `deleteAccount`, `verifyOTP`, etc.).`
- `34: - `SessionManager` upgraded with Token Refresh Queue and Absolute Session Lifetime.`
- `37: - `AuthAuditLogger` upgraded to log Session ID, IP, and reasons without leaking secrets.`
- `42: - `src/core/platform/auth/AuthAuditLogger.ts`: Specialized audit logger for capturing authentication success, failure, and logout events.`
- `43: - `src/core/platform/auth/AppLockService.ts`: Background inactivity tracker to enforce session timeout and automatic app locking.`
- `48: - `src/core/platform/auth/AccountLockoutService.ts`: Lockout system after repeated failed login attempts.`
- `55: - `src/core/platform/auth/SessionManager.ts`: Session handling with multi-device tracking, remote revocation, and refresh token rotation.`
- `91: - `src/core/platform/user/RoleManager.ts`: RBAC system mapping roles to permissions.`
- `97: - src/design-system/ — 15+ DS components (DSText, DSButton, DSInput, DSCard, DSBadge/Chip/Tag, DSAvatar/Group, Loading/Skeleton, EmptyState/ErrorState, BottomSheet, Toast, OTPInput, SearchBar, ProgressBar/Steps/Divider)`
- `98: - src/design-system/tokens.ts — Centralized design tokens with Admin override support`
- `99: - src/theme/ThemeEngine.ts — Runtime Admin-configurable theme engine`
### state_transitions
- `7: - Remote Data Source (Batch 9): Built `RemoteDataSource` using the existing `HttpClient` to map entity CRUD operations to RESTful endpoints with error handling.`
- `10: - Sync Engine (Batch 6): Implemented `SyncManager`, `SyncWorker`, `QueueProcessor`, `RetryScheduler` (Exponential Backoff), and `BackgroundSynchronizer`.`
- `42: - `src/core/platform/auth/AuthAuditLogger.ts`: Specialized audit logger for capturing authentication success, failure, and logout events.`
- `48: - `src/core/platform/auth/AccountLockoutService.ts`: Lockout system after repeated failed login attempts.`
- `53: - `src/core/platform/auth/AuthStateMachine.ts`: Explicit state machine managing transitions (Authenticating, Locked, Expired).`
- `60: - `src/core/platform/jobs/JobManager.ts`: Background job enqueuing, priority scheduling, and status tracking.`
- `67: - `src/core/platform/communication/NotificationCenterManager.ts`: Centralized notification read status and archiving.`
- `97: - src/design-system/ — 15+ DS components (DSText, DSButton, DSInput, DSCard, DSBadge/Chip/Tag, DSAvatar/Group, Loading/Skeleton, EmptyState/ErrorState, BottomSheet, Toast, OTPInput, SearchBar, ProgressBar/Steps/Divider)`
- `100: - src/services/HttpClient.ts — Centralized HTTP client (retry, cache, offline queue, interceptors, pagination, ssl pinning prep)`
- `101: - src/services/ErrorHandler.ts — AppError class, tryCatch, global ErrorBoundary`
- `114: - TypeScript strict mode enabled (Zero TS errors build)`
### payment_insurance_relevance
- `59: - `src/core/platform/integration/Adapters.ts`: Interfaces for Maps, SMS, AI, and Insurance external integrations.`
- `70: - `src/core/platform/business/LoyaltyManager.ts`: Loyalty points, tiers, and wallet balance management.`
- `76: - `src/core/platform/commerce/CartManager.ts`: Local cart management with tax and discount calculation logic.`
- `77: - `src/core/platform/payment/PaymentProvider.ts`: Abstract interface for Payment Gateway integration ensuring provider agnosticism.`
- `97: - src/design-system/ — 15+ DS components (DSText, DSButton, DSInput, DSCard, DSBadge/Chip/Tag, DSAvatar/Group, Loading/Skeleton, EmptyState/ErrorState, BottomSheet, Toast, OTPInput, SearchBar, ProgressBar/Steps/Divider)`
### error_empty_loading_retry_cancel
- `7: - Remote Data Source (Batch 9): Built `RemoteDataSource` using the existing `HttpClient` to map entity CRUD operations to RESTful endpoints with error handling.`
- `10: - Sync Engine (Batch 6): Implemented `SyncManager`, `SyncWorker`, `QueueProcessor`, `RetryScheduler` (Exponential Backoff), and `BackgroundSynchronizer`.`
- `26: - Idempotency & Correlation ID tracking for offline queues`
- `43: - `src/core/platform/auth/AppLockService.ts`: Background inactivity tracker to enforce session timeout and automatic app locking.`
- `48: - `src/core/platform/auth/AccountLockoutService.ts`: Lockout system after repeated failed login attempts.`
- `97: - src/design-system/ — 15+ DS components (DSText, DSButton, DSInput, DSCard, DSBadge/Chip/Tag, DSAvatar/Group, Loading/Skeleton, EmptyState/ErrorState, BottomSheet, Toast, OTPInput, SearchBar, ProgressBar/Steps/Divider)`
- `100: - src/services/HttpClient.ts — Centralized HTTP client (retry, cache, offline queue, interceptors, pagination, ssl pinning prep)`
- `101: - src/services/ErrorHandler.ts — AppError class, tryCatch, global ErrorBoundary`
- `109: - src/core/data/ — BaseRepository, Local/Remote Data Source interfaces, and DTO Mappers for Offline-first architecture`
- `114: - TypeScript strict mode enabled (Zero TS errors build)`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
