# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/services/ErrorHandler.tsx`
- **Member SHA-256:** `1f91909dc2c2aca4fc09d13e1c119bf5a70dcc057e52c15d73c55aad15ad20b0`
- **Line count:** 197
- **Read range:** `1-197`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `23: | 'CANCELLED_ERROR';`
- `45: return new AppError('CANCELLED_ERROR', 'Request cancelled', error);`
- `77: CANCELLED_ERROR:   'تم إلغاء العملية.',`
- `162: onPress={this.reset}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `8: import { Spacing } from '../design-system/tokens';`
### state_transitions
- `2: * Error Handling — Centralized error management.`
- `3: * Global React Error Boundary + structured error types + user-friendly messages.`
- `11: // Error Types`
- `13: export type AppErrorCode =`
- `14: | 'NETWORK_ERROR'`
- `15: | 'TIMEOUT_ERROR'`
- `16: | 'AUTH_ERROR'`
- `17: | 'FORBIDDEN_ERROR'`
- `18: | 'NOT_FOUND_ERROR'`
- `19: | 'VALIDATION_ERROR'`
- `20: | 'SERVER_ERROR'`
- `21: | 'UNKNOWN_ERROR'`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `2: * Error Handling — Centralized error management.`
- `3: * Global React Error Boundary + structured error types + user-friendly messages.`
- `11: // Error Types`
- `13: export type AppErrorCode =`
- `14: | 'NETWORK_ERROR'`
- `15: | 'TIMEOUT_ERROR'`
- `16: | 'AUTH_ERROR'`
- `17: | 'FORBIDDEN_ERROR'`
- `18: | 'NOT_FOUND_ERROR'`
- `19: | 'VALIDATION_ERROR'`
- `20: | 'SERVER_ERROR'`
- `21: | 'UNKNOWN_ERROR'`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
