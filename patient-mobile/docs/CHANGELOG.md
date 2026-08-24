# Changelog
All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]
- Finalization (Batch 10): Created `RepositoryCoordinator` for initialization and DI wiring, finalizing Phase 1C-C Data Layer Architecture.
- Remote Data Source (Batch 9): Built `RemoteDataSource` using the existing `HttpClient` to map entity CRUD operations to RESTful endpoints with error handling.
- Data Sources (Batch 8): Built `SQLiteDataSource` as a concrete `ILocalDataSource`, implementing generic CRUD and automated mapping of `QuerySpecification` to raw SQL queries.
- Conflict Resolution (Batch 7): Built `ConflictResolver` supporting Server Wins, Client Wins, Last Write Wins (LWW), Merge, and Manual strategies using `sync_metadata` versions.
- Sync Engine (Batch 6): Implemented `SyncManager`, `SyncWorker`, `QueueProcessor`, `RetryScheduler` (Exponential Backoff), and `BackgroundSynchronizer`.
- Repository Behaviors (Batch 5): Implemented `QuerySpecification`, `UnitOfWork`, and integrated Domain Events via `EventBus` inside `CompositeRepository`.
- Repository Layer (Batch 4): `IRepository`, `BaseRepository`, `CompositeRepository`, `RepositoryRegistry`, and `RepositoryFactory`.
- Migrations (Batch 3): `MigrationRunner` supporting automatic execution, transactions (rollback), and version history tracking.
- Database Schema (Batch 2): Defined robust SQLite schema with Soft Delete, Audit Trail, and dedicated `sync_metadata` tables.
- Database Foundation (Batch 1): `IDatabaseDriver`, `SQLiteDriver`, `DatabaseProvider`, `ConnectionPool`, `TransactionManager`, and `DatabaseHealthChecker`.

## [0.3.4] — 2026-07-13 — Phase 1C-B Final Polish
### Added
- Enterprise Redux Architecture (`ReducerManager`, `FeatureRegistry`, `listenerMiddleware`)
- Encrypted Persistence Layer (`SecureStorageAdapter` with AES & Key Rotation)
- Versioning & Rollback logic for Redux Persist
- RTK Query Infrastructure wrapped around `HttpClient`
- Cache Memory Manager Middleware
- Background Sync Middleware & Observability Middleware
- Centralized `syncSlice` and 15+ other scaffolded slices
- Idempotency & Correlation ID tracking for offline queues
- Jest Unit Tests for Core Store files

## [0.3.3] — 2026-07-13 — Phase 1C-A Validation & Documentation
### Added
- `AUTHENTICATION.md` and `SECURITY.md` added to `/docs`.
- Unit tests added for Auth modules (`SessionManager`, `AccountLockoutService`, `PasswordPolicyService`).
- `IAuthProvider` extended with comprehensive methods (`signIn`, `deleteAccount`, `verifyOTP`, etc.).
- `SessionManager` upgraded with Token Refresh Queue and Absolute Session Lifetime.
- `SecureStorageService` created to wrap expo-secure-store.
- `BiometricService` upgraded to detect enrollment changes and support passcode fallback.
- `AuthAuditLogger` upgraded to log Session ID, IP, and reasons without leaking secrets.

## [0.3.2] — 2026-07-13 — Phase 1C-A Complete
### Added
- `src/core/platform/auth/BiometricService.ts`: Native biometric authentication integration (FaceID/TouchID) using expo-local-authentication.
- `src/core/platform/auth/AuthAuditLogger.ts`: Specialized audit logger for capturing authentication success, failure, and logout events.
- `src/core/platform/auth/AppLockService.ts`: Background inactivity tracker to enforce session timeout and automatic app locking.

## [0.3.1] — 2026-07-13 — Phase 1C-A (Batch 2)
### Added
- `src/core/platform/auth/PasswordPolicyService.ts`: Centralized password rules validation.
- `src/core/platform/auth/AccountLockoutService.ts`: Lockout system after repeated failed login attempts.
- `src/core/platform/auth/AuthProviders.ts`: Abstract interfaces and stubs for Google, Apple, and Email auth providers.

## [0.3.0] — 2026-07-13 — Phase 1C-A (Batch 1)
### Added
- `src/core/platform/auth/AuthStateMachine.ts`: Explicit state machine managing transitions (Authenticating, Locked, Expired).
- `src/core/platform/auth/DeviceTracker.ts`: Abstracted device registration and unique persistent ID generation.
- `src/core/platform/auth/SessionManager.ts`: Session handling with multi-device tracking, remote revocation, and refresh token rotation.

## [0.2.4] — 2026-07-13 — Phase 1B Complete
### Added
- `src/core/platform/integration/Adapters.ts`: Interfaces for Maps, SMS, AI, and Insurance external integrations.
- `src/core/platform/jobs/JobManager.ts`: Background job enqueuing, priority scheduling, and status tracking.
- `src/core/events/EventBus.ts`: Asynchronous domain event Pub/Sub bus for module decoupling.
- `src/core/platform/cache/CacheManager.ts`: Centralized memory and disk caching strategy with TTL support.

## [0.2.3] — 2026-07-13 — Phase 1B (Batches 7-8)
### Added
- `src/core/platform/communication/MessagingService.ts`: Omni-channel messaging abstraction (In-app, Push, Email, SMS).
- `src/core/platform/communication/NotificationCenterManager.ts`: Centralized notification read status and archiving.
- `src/core/platform/business/FavoritesManager.ts`: Bookmarking platform for doctors, pharmacies, and products.
- `src/core/platform/business/ReviewManager.ts`: Review, rating, and moderation infrastructure.
- `src/core/platform/business/LoyaltyManager.ts`: Loyalty points, tiers, and wallet balance management.

## [0.2.2] — 2026-07-13 — Phase 1B (Batches 5-6)
### Added
- `src/core/platform/scheduling/ScheduleManager.ts`: Core scheduling engine supporting time slots and availability.
- `src/core/platform/scheduling/QueueEngine.ts`: Digital queue abstraction for wait times and prioritization.
- `src/core/platform/commerce/CartManager.ts`: Local cart management with tax and discount calculation logic.
- `src/core/platform/payment/PaymentProvider.ts`: Abstract interface for Payment Gateway integration ensuring provider agnosticism.

## [0.2.1] — 2026-07-13 — Phase 1B (Batches 3-4)
### Added
- `src/core/platform/search/SearchEngine.ts`: Global search abstraction supporting filters, sorting, and pagination.
- `src/core/platform/location/LocationService.ts`: Geocoding, reverse geocoding, and distance calculation abstraction.
- `src/core/platform/media/MediaManager.ts`: Centralized file upload, compression, and secure URL manager.
- `src/core/platform/realtime/RealtimeClient.ts`: WebSocket abstraction for presence, subscriptions, and auto-reconnect.

## [0.2.0] — 2026-07-13 — Phase 1B (Batches 1-2)
### Added
- `src/core/di/Container.ts`: Centralized lightweight Dependency Injection Container.
- `src/core/domain/value-objects/index.ts`: Shared domain Value Objects (Address, Money, DateRange, TimeSlot, ContactInfo, Rating).
- `src/core/domain/entities/`: Comprehensive Domain Entities (Users, Providers, Clinical, Commerce, System).
- `src/core/platform/user/RoleManager.ts`: RBAC system mapping roles to permissions.
- `src/core/platform/user/UserProfileService.ts`: Profile abstraction for users and providers.
- `src/core/events/AuditManager.ts`: Audit trail infrastructure for logging critical business actions.

## [0.1.0] — 2026-07-13 — Phase 1A Complete
### Added
- src/design-system/ — 15+ DS components (DSText, DSButton, DSInput, DSCard, DSBadge/Chip/Tag, DSAvatar/Group, Loading/Skeleton, EmptyState/ErrorState, BottomSheet, Toast, OTPInput, SearchBar, ProgressBar/Steps/Divider)
- src/design-system/tokens.ts — Centralized design tokens with Admin override support
- src/theme/ThemeEngine.ts — Runtime Admin-configurable theme engine
- src/services/HttpClient.ts — Centralized HTTP client (retry, cache, offline queue, interceptors, pagination, ssl pinning prep)
- src/services/ErrorHandler.ts — AppError class, tryCatch, global ErrorBoundary
- src/services/Logger.ts — Sensitive-data-redacting logger with dev/prod modes and remote sinks
- src/services/Analytics.ts — Multi-provider analytics abstraction with consent gate
- src/services/PermissionsManager.ts — Centralized permissions for 9 OS permission types
- src/services/FeatureFlags.ts — Remote-configurable feature flags with deterministic user bucketing
- src/services/FileManager.ts — Centralized cache clearing, downloads, and multipart uploads
- src/services/Notifications.ts — Local and Push notification abstraction
- src/services/auth/ — AuthManager and AuthInterceptor
- src/core/data/ — BaseRepository, Local/Remote Data Source interfaces, and DTO Mappers for Offline-first architecture
- src/i18n/LanguageManager.ts — i18n-js powered manager with 6 languages, async persistence, and RTL setup
- src/navigation/ — AuthGuard, AdminGuard, DeepLinking, and Expo Router config
- Redux Toolkit + redux-persist setup
- Path aliases: @/design-system, @/theme, @/services, @/hooks, @/store, @/types, @/constants, @/utils, @/guided-tour
- TypeScript strict mode enabled (Zero TS errors build)
- Environmental configurations: `.env.development`, `.env.staging`, `.env.production`
- Complete `/docs/` structure

### Changed
- `tsconfig.json`: Enabled `strict: true` and added comprehensive path aliases (`@/design-system`, `@/theme`, `@/services`, `@/hooks`, etc.).
- `babel.config.js`: Added `module-resolver` plugin to support path aliases in Metro.

## [0.0.1] — Project initialization
### Added
- Initial Expo project setup.
- Basic screens (Home, Pharmacy, Consultations, Diagnostics, Nursing).
- Basic theme system.
- Initial i18n structure (6 languages).
- Redux store initialization.
