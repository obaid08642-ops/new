# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/di/Container.ts`
- **Member SHA-256:** `0c79bc3bf92ffa5c45b72902f5c8b30c0570c62ece2ef9d62464a4cc5556fb63`
- **Line count:** 160
- **Read range:** `1-160`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `56: * Register a singleton instance.`
- `58: public register<T>(token: string, instance: T): void {`
- `66: * Register a factory for transient resolution or lazy singletons.`
- `68: public registerFactory<T>(token: string, factory: () => T): void {`
- `150: // Register Phase 1B Repositories`
- `152: // Register the domain EventBus singleton so consumers (e.g. Redux integration`
- `154: container.register(Tokens.EventBus, new EventBus());`
- `156: container.registerFactory(Tokens.UserRepository, () => {`
### backend_consumers_or_contracts
- `1: import { SecureStorageService } from '../platform/auth/SecureStorageService';`
- `2: import { BiometricService } from '../platform/auth/BiometricService';`
- `3: import { AuthAuditLogger } from '../platform/auth/AuthAuditLogger';`
- `4: import { AppLockService } from '../platform/auth/AppLockService';`
- `5: import { PasswordPolicyService } from '../platform/auth/PasswordPolicyService';`
- `6: import { AccountLockoutService } from '../platform/auth/AccountLockoutService';`
- `7: import { AuthStateMachine } from '../platform/auth/AuthStateMachine';`
- `8: import { DeviceTracker } from '../platform/auth/DeviceTracker';`
- `9: import { SessionManager } from '../platform/auth/SessionManager';`
### auth_ownership
- `9: import { SessionManager } from '../platform/auth/SessionManager';`
- `25: import { RoleManager } from '../platform/user/RoleManager';`
- `58: public register<T>(token: string, instance: T): void {`
- `59: if (this.services.has(token)) {`
- `60: console.warn(`[DI] Overwriting existing service for token: ${token}`);`
- `62: this.services.set(token, instance);`
- `68: public registerFactory<T>(token: string, factory: () => T): void {`
- `69: this.factories.set(token, factory);`
- `75: public resolve<T>(token: string): T {`
- `76: if (this.services.has(token)) {`
- `77: return this.services.get(token) as T;`
- `80: if (this.factories.has(token)) {`
### state_transitions
- `7: import { AuthStateMachine } from '../platform/auth/AuthStateMachine';`
- `88: throw new Error(`[DI] Service not found for token: ${token}`);`
- `135: AuthStateMachine: 'AuthStateMachine',`
### payment_insurance_relevance
- `127: PaymentProvider: 'PaymentProvider',`
### error_empty_loading_retry_cancel
- `88: throw new Error(`[DI] Service not found for token: ${token}`);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
