# Phase 1B Implementation Plan: Core Platform Services & Business Infrastructure

This document outlines the architectural plan for executing **Phase 1B** of Nabdah Plus. The objective is to build reusable business infrastructure and shared platform services that every future module will depend on, strictly avoiding end-user UI business feature implementation.

## Proposed Architecture Updates & Enhancements

Phase 1B will introduce a rigorous Domain-Driven Design (DDD) structure within the `src/core/domain` and `src/core/services` directories, as well as abstract interfaces for external integrations.

### Architecture Adjustments
1. **Dependency Injection**: Centralized DI / Service Locator via `tsyringe` or custom container so every service is injectable.
2. **Repository Pattern**: Every business module strictly depends on repository interfaces (`src/core/data`), not concrete implementations.
3. **API Versioning**: `HttpClient` updated to dynamically support `v1`, `v2`, etc., without hardcoding URLs.
4. **Cache Strategy**: Implement a centralized `CacheManager` with configurable TTL, invalidation policies, and hybrid Memory/Disk (`expo-file-system`) support.
5. **Audit Trail**: Implement `AuditManager` to record critical business actions securely.
6. **Configuration Service**: Enhance `ConfigManager` to support Remote Config integration and priority-based environment overrides.
7. **Domain Events**: Implement an async `EventBus` supporting Pub/Sub with strongly typed domain event payloads.
8. **Background Jobs**: Build `JobManager` for persistence, retry logic, scheduling, cancellation, and prioritization of offline jobs.
9. **Feature Modularity**: Enforce isolation. Feature A (e.g. Doctors) cannot directly import from Feature B (Pharmacy). They communicate via the `EventBus` and shared Interfaces.
10. **Future Scalability**: All external adapters (Payment, SMS, Maps, Storage) are provider-agnostic Interfaces.

### Directory Structure Enhancements
```
src/
├── core/
│   ├── di/                   # Dependency Injection Container
│   ├── domain/               # Enterprise business rules (Entities, Value Objects, Use Cases)
│   ├── data/                 # Interfaces, Repositories, Caching
│   ├── events/               # EventBus & Audit Trail
│   └── platform/             # Core platform services
│       ├── search/           # Global Search Engine
│       ├── location/         # Maps & Geocoding abstraction
│       ├── media/            # Upload, Compression, Metadata
│       ├── realtime/         # Socket abstraction
│       ├── scheduling/       # Availability & Queue Engine
│       ├── commerce/         # Cart, Tax, Payment abstraction
│       ├── communication/    # Messaging & Notification Center
│       ├── jobs/             # Background JobManager
│       └── integration/      # Adapters (Payment, SMS, AI)
```

## Batch Execution Strategy

### Batch 1: Domain & Business Layer
- **Architecture**: Establish `src/core/domain/` with separate directories for Entities, Value Objects, DTOs, Use Cases, Repositories, Services, Validators, and Mappers. Implement the **Dependency Injection Container**.
- **Models**: Create TypeScript interfaces/classes for User, Patient, Provider, Pharmacy, Doctor, Nurse, Laboratory, Clinic, Insurance, Medication, Prescription, Appointment, Consultation, Address, Notification, Review, Payment, Order, Invoice, Coupon, Loyalty, Wallet, Attachment.

### Batch 2: User & Account Platform
- **Profile Infrastructure**: Create `UserProfileService` supporting modular personal info.
- **RBAC & Audit**: Implement `RoleManager` handling Guest, Patient, Provider, Admin with granular permissions. Initialize the **Audit Trail** for tracking role/profile changes.

### Batch 3: Search & Discovery
- **Global Search**: Develop `SearchEngine` with support for filters, sorting, pagination, and history.
- **Location Platform**: Develop `LocationService` abstracting Geocoding, Distance calculation, and Service radius (provider-agnostic).

### Batch 4: Media & Communication
- **Media Service**: Build `MediaManager` for multi-format upload, compression, and secure URLs.
- **Realtime Infrastructure**: Build `RealtimeClient` abstracting WebSockets, handling presence, auto-reconnect, and heartbeat.

### Batch 5: Booking & Scheduling
- **Scheduling Engine**: Create `ScheduleManager` handling time slots, buffers, holidays, and working hours.
- **Queue System**: Build `QueueEngine` for waiting lists, estimated wait times, and priority queues.

### Batch 6: Commerce Infrastructure
- **Cart Foundation**: Build `CartManager` for items, discounts, taxes, and price calculation.
- **Payment Abstraction**: Define `PaymentProvider` interface handling transactions, refunds, webhooks, and idempotency.

### Batch 7: Notifications & Communication
- **Messaging**: Build `MessagingService` abstracting in-app, email, and SMS templates/variables.
- **Notification Center**: Develop `NotificationCenterManager` managing read status, categories, priorities, and archiving.

### Batch 8: Business Services
- **Favorites**: Build `FavoritesManager` for bookmarking entities.
- **Reviews**: Create `ReviewManager` handling ratings, replies, and moderation status.
- **Loyalty**: Prepare `LoyaltyManager` architecture (Points, Wallet, Rewards).

### Batch 9: Integration Readiness
- **External Integration**: Define Adapter Interfaces for Payment, SMS, Email, AI.
- **Background Jobs**: Build the **JobManager** infrastructure.
- **Event Bus**: Implement the internal **EventBus** (Pub/Sub).

## Verification Plan
1. **TypeScript Adherence**: Run `tsc --noEmit` after every batch.
2. **Linting**: Ensure 0 ESLint warnings/errors.
3. **Modularity Check**: Ensure features do not directly reference each other's concrete implementations.
