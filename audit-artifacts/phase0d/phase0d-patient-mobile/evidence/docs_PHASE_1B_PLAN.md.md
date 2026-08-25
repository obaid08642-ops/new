# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `docs/PHASE_1B_PLAN.md`
- **Member SHA-256:** `be943821b7369d2466efc1526deaff7c71d47187e3c8ce77242e8dab557b4d61`
- **Line count:** 84
- **Read range:** `1-84`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `17: 8. **Background Jobs**: Build `JobManager` for persistence, retry logic, scheduling, cancellation, and prioritization of offline jobs.`
- `32: │       ├── media/            # Upload, Compression, Metadata`
- `56: - **Media Service**: Build `MediaManager` for multi-format upload, compression, and secure URLs.`
- `59: ### Batch 5: Booking & Scheduling`
- `65: - **Payment Abstraction**: Define `PaymentProvider` interface handling transactions, refunds, webhooks, and idempotency.`
- `72: - **Favorites**: Build `FavoritesManager` for bookmarking entities.`
### backend_consumers_or_contracts
- `33: │       ├── realtime/         # Socket abstraction`
- `57: - **Realtime Infrastructure**: Build `RealtimeClient` abstracting WebSockets, handling presence, auto-reconnect, and heartbeat.`
### auth_ownership
- `49: - **RBAC & Audit**: Implement `RoleManager` handling Guest, Patient, Provider, Admin with granular permissions. Initialize the **Audit Trail** for tracking role/profile changes.`
### state_transitions
- `17: 8. **Background Jobs**: Build `JobManager` for persistence, retry logic, scheduling, cancellation, and prioritization of offline jobs.`
- `65: - **Payment Abstraction**: Define `PaymentProvider` interface handling transactions, refunds, webhooks, and idempotency.`
- `69: - **Notification Center**: Develop `NotificationCenterManager` managing read status, categories, priorities, and archiving.`
- `73: - **Reviews**: Create `ReviewManager` handling ratings, replies, and moderation status.`
- `83: 2. **Linting**: Ensure 0 ESLint warnings/errors.`
### payment_insurance_relevance
- `16: 7. **Domain Events**: Implement an async `EventBus` supporting Pub/Sub with strongly typed domain event payloads.`
- `19: 10. **Future Scalability**: All external adapters (Payment, SMS, Maps, Storage) are provider-agnostic Interfaces.`
- `35: │       ├── commerce/         # Cart, Tax, Payment abstraction`
- `38: │       └── integration/      # Adapters (Payment, SMS, AI)`
- `45: - **Models**: Create TypeScript interfaces/classes for User, Patient, Provider, Pharmacy, Doctor, Nurse, Laboratory, Clinic, Insurance, Medication, Prescription, Appointment, Consultation, Address, Notification, Review, Payment, Order, Invo`
- `64: - **Cart Foundation**: Build `CartManager` for items, discounts, taxes, and price calculation.`
- `65: - **Payment Abstraction**: Define `PaymentProvider` interface handling transactions, refunds, webhooks, and idempotency.`
- `74: - **Loyalty**: Prepare `LoyaltyManager` architecture (Points, Wallet, Rewards).`
- `77: - **External Integration**: Define Adapter Interfaces for Payment, SMS, Email, AI.`
### error_empty_loading_retry_cancel
- `17: 8. **Background Jobs**: Build `JobManager` for persistence, retry logic, scheduling, cancellation, and prioritization of offline jobs.`
- `83: 2. **Linting**: Ensure 0 ESLint warnings/errors.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
