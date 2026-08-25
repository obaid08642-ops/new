# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `docs/PHASE_1B.md`
- **Member SHA-256:** `5edaff8442f665f02ca0bf20d682d536a7d7aaa420b74938df52f5f699ced50a`
- **Line count:** 100
- **Read range:** `1-100`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `15: - **Batch 5 (Booking):** `ScheduleManager`, `QueueEngine`.`
- `64: EventBus --> UI[Screen Updates]`
### backend_consumers_or_contracts
- `61: Client[RealtimeClient] -->|WebSocket| Server[Backend Node]`
### auth_ownership
- `12: - **Batch 2 (User Platform):** `UserProfileService`, `RoleManager` (RBAC), `AuditManager`.`
- `72: ## 5. RBAC Permission Matrix`
- `73: | Role | Permissions |`
- `78: | **Admin** | `access_admin_dashboard`, `manage_users`, `manage_roles` |`
### state_transitions
- `3: **Status:** 🟢 **COMPLETED**`
- `10: ## 2. Delivered Batches`
- `87: > Phase 1B is fully executed with 0 TypeScript errors. Please review the deliverables. If you approve, we are ready to move into Phase 1C.`
- `94: - **Result Pattern**: A unified Result<T> structure instead of throwing errors.`
- `95: - **Unified Error Model**: DomainError, ValidationError, ApiError, etc.`
### payment_insurance_relevance
- `16: - **Batch 6 (Commerce):** `CartManager`, `PaymentProvider` (Abstraction).`
- `43: Cart->>Bus: publish('ORDER_PLACED', payload)`
- `53: App --> PaymentProvider`
- `54: PaymentProvider --> StripeAdapter`
- `55: PaymentProvider --> PayTabsAdapter`
- `98: - **Commerce VO**: Value objects for Currency, Tax, Percentage, and Discount.`
### error_empty_loading_retry_cancel
- `84: - **Offline Sync:** Connecting the `JobManager` and `EventBus` to push offline transactions when the network is restored.`
- `87: > Phase 1B is fully executed with 0 TypeScript errors. Please review the deliverables. If you approve, we are ready to move into Phase 1C.`
- `94: - **Result Pattern**: A unified Result<T> structure instead of throwing errors.`
- `95: - **Unified Error Model**: DomainError, ValidationError, ApiError, etc.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
