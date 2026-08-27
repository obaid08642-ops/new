# Architectural Decision Records (ADR)

This document tracks all significant architectural decisions made during the project.

## ADR-001: Design System as separate src/design-system module
**Date:** 2026-07-13
**Status:** Accepted
**Context:** Need a reusable UI foundation that enforces the brand identity without tightly coupling to business logic.
**Decision:** All core UI components (Button, Text, Card, etc.) live strictly in `src/design-system/`. They consume central tokens. Feature modules import from `@/design-system` barrel export.
**Consequences:** Ensures consistency. Makes white-labeling and theme overrides much easier. Requires all developers to stick to DS components instead of raw React Native components for UI elements.

## ADR-002: Barrel exports (index.ts) for all modules
**Date:** 2026-07-13
**Status:** Accepted
**Context:** Need to enforce clean boundaries between modules.
**Decision:** Every module must have an `index.ts` file that explicitly exports its public API.
**Consequences:** Prevents deep imports (e.g., `import { X } from '@/modules/pharmacy/components/X'`). Enforces encapsulation.

## ADR-003: Path aliases (@/design-system, @/services, etc.)
**Date:** 2026-07-13
**Status:** Accepted
**Context:** Relative paths (`../../../../utils`) become unmaintainable as project grows.
**Decision:** Configured `tsconfig.json` and `babel.config.js` to use `@/` prefixes for all top-level `src/` directories.
**Consequences:** Cleaner imports, easier refactoring. Requires running `babel-plugin-module-resolver`.

## ADR-004: TypeScript strict mode
**Date:** 2026-07-13
**Status:** Accepted
**Context:** Prevent runtime errors and ensure code quality.
**Decision:** `strict: true` enabled in `tsconfig.json`.
**Consequences:** Slower initial development but significantly fewer bugs. Eliminates implicit `any`.

## ADR-005: HttpClient replaces raw fetch
**Date:** 2026-07-13
**Status:** Accepted
**Context:** Need centralized logic for retries, timeouts, caching, and token injection.
**Decision:** Built `HttpClient.ts` with interceptors and offline queue. No direct `fetch` calls allowed in feature modules.
**Consequences:** Consistent network behavior. Easier to mock for testing.

## ADR-006: Analytics abstraction layer
**Date:** 2026-07-13
**Status:** Accepted
**Context:** Avoid vendor lock-in to Firebase or PostHog.
**Decision:** Created an `AnalyticsProvider` interface and `AnalyticsManager`. All analytics calls go through `analytics.track()`.
**Consequences:** Can swap providers easily. Enforces a consent gate for privacy.

## ADR-007: FeatureFlags with static defaults + remote override
**Date:** 2026-07-13
**Status:** Accepted
**Context:** Need ability to toggle features, run A/B tests, and target specific versions without app updates.
**Decision:** Created `FeatureFlagsManager` that ships with static defaults and fetches overrides from the server.
**Consequences:** Graceful fallback if offline. Deterministic bucketing based on hashed user IDs.

## ADR-008: Repository pattern for data layer
**Date:** 2026-07-13
**Status:** Accepted
**Context:** Need to decouple data access (local + remote) from UI and State logic.
**Decision:** Defined `Repository<T>`, `LocalDataSource<T>`, and `RemoteDataSource<T>`. Screens only talk to repositories.
**Consequences:** Easy offline-first implementation. UI doesn't care if data comes from API or SQLite.

## ADR-009: Environment-based configuration (dev/staging/prod)
**Date:** 2026-07-13
**Status:** Accepted
**Context:** Need distinct environments for testing and production.
**Decision:** Created `ConfigManager.ts` that dynamically detects environment based on `process.env` and EAS profiles.
**Consequences:** Zero hardcoded API URLs. Secrets managed via `.env` files.

## ADR-010: Admin-configurable ThemeEngine
**Date:** 2026-07-13
**Status:** Accepted
**Context:** Need to allow business team to tweak colors and banners without an App Store release.
**Decision:** `ThemeEngine` fetches remote config and overrides base Design System tokens at runtime.
**Consequences:** High flexibility. Requires careful memoization to avoid re-renders when theme updates.

## ADR-011: Centralized PermissionsManager
**Date:** 2026-07-13
**Status:** Accepted
**Context:** OS permission requests are scattered and handle rejections poorly.
**Decision:** Built `PermissionsManager` as a single access point with fallback to OS Settings.
**Consequences:** Consistent UX for permission requests across all features.

## ADR-012: Error handling via AppError class + tryCatch
**Date:** 2026-07-13
**Status:** Accepted
**Context:** Try/catch blocks are verbose and often lose type safety.
**Decision:** Adopted an `AppError` class and a tuple-returning `tryCatch` helper function (similar to Go).
**Consequences:** Forces developers to handle errors explicitly. Standardizes user-facing error messages in Arabic.

## ADR-013: Redux Persist for State Management
**Date:** 2026-07-13
**Status:** Accepted
**Context:** Need robust offline state recovery.
**Decision:** Integrate redux-persist with AsyncStorage.
**Consequences:** State is rehydrated automatically, but requires serializable checks to be adjusted.

## ADR-014: Modular Feature Architecture
**Date:** 2026-07-13
**Status:** Accepted
**Context:** The app will grow to include many business modules.
**Decision:** Create a src/features/ directory isolating domain logic, presentation, and data.
**Consequences:** Keeps the codebase scalable and prevents monolithic UI files.

## ADR-015: Domain-Driven Architecture
**Date:** 2026-07-13
**Status:** Accepted
**Context:** The app needs a scalable structure to house complex business rules without tying them to UI components.
**Decision:** Adopt a Domain-Driven Design (DDD) approach within src/core/domain/.
**Consequences:** Clear separation of concerns.

## ADR-016: Dependency Injection
**Date:** 2026-07-13
**Status:** Accepted
**Context:** Tightly coupled services.
**Decision:** Implemented lightweight DIContainer.
**Consequences:** Services are mockable.

## ADR-017: Event-Driven Module Decoupling
**Date:** 2026-07-13
**Status:** Accepted
**Decision:** Implemented EventBus for Pub/Sub domain events.

## ADR-018: Provider-Agnostic Integrations
**Date:** 2026-07-13
**Status:** Accepted
**Decision:** Defined strict abstract Interfaces for all external adapters.

## ADR-016: Encryption Key Rotation
**Date:** 2026-07-13
**Status:** Accepted
**Context:** Storing sensitive Redux state in AsyncStorage requires AES encryption. The encryption key is held in SecureStore. Over time, rotating encryption keys is a security best practice.
**Decision:** We implemented versioned keys (`REDUX_PERSIST_KEY_VERSION`). If a version mismatch is detected, a new key is generated and the data is re-encrypted on the fly during migration.
**Consequences:** Enhances security against long-term cryptographic attacks. Requires careful testing to ensure data is not lost during the rotation phase.

## ADR-017: Network Idempotency & Correlation
**Date:** 2026-07-13
**Status:** Accepted
**Context:** Offline queues can accidentally submit the same POST/PATCH request multiple times when network drops repeatedly.
**Decision:** All mutating requests (POST, PUT, PATCH, DELETE) now inject an `X-Idempotency-Key` header generated on the client. All requests (including GET) inject an `X-Correlation-ID`.
**Consequences:** Prevents duplicate charges or operations on the backend, and provides a unified trace ID for logging across microservices.
