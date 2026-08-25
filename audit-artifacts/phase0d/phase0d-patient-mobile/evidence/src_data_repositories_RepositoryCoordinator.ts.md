# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/data/repositories/RepositoryCoordinator.ts`
- **Member SHA-256:** `c057eea6ee0e2d1dad9d510c84ccf2a451b412e5079a9f3b457ac07e959ddd42`
- **Line count:** 59
- **Read range:** `1-59`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `30: // 3. Register Core System Repositories (Example)`
- `31: this.registerCoreRepositories(dbManager);`
- `38: * Helper to quickly register a new offline-first repository for a specific feature.`
- `41: public static registerFeatureRepository<T extends IBaseEntity>(`
- `50: console.log(`[RepositoryCoordinator] Registered Repository for ${tableName}`);`
- `53: private static registerCoreRepositories(dbManager: DatabaseManager): void {`
- `54: // Example: Registering the users repository globally`
- `55: this.registerFeatureRepository('users', '/api/v1/users', dbManager);`
- `57: // Future system tables can be registered here.`
### backend_consumers_or_contracts
- `55: this.registerFeatureRepository('users', '/api/v1/users', dbManager);`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `34: console.log('[RepositoryCoordinator] Data Layer Initialized Successfully.');`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `38: * Helper to quickly register a new offline-first repository for a specific feature.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
