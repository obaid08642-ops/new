# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/domain/errors/index.ts`
- **Member SHA-256:** `18254049e8ebee34cf1e49dff3918f3c003cea619008feaac9bfc93e3ae91aa9`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: export type ErrorType =`
- `2: | 'DomainError'`
- `3: | 'ValidationError'`
- `4: | 'BusinessError'`
- `5: | 'InfrastructureError'`
- `6: | 'ApiError'`
- `11: export class BaseError extends Error {`
- `12: public readonly type: ErrorType;`
- `15: constructor(type: ErrorType, message: string, code?: string) {`
- `24: export class DomainError extends BaseError { constructor(msg: string) { super('DomainError', msg); } }`
- `25: export class ValidationError extends BaseError { constructor(msg: string) { super('ValidationError', msg); } }`
- `26: export class BusinessError extends BaseError { constructor(msg: string, code?: string) { super('BusinessError', msg, code); } }`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `1: export type ErrorType =`
- `2: | 'DomainError'`
- `3: | 'ValidationError'`
- `4: | 'BusinessError'`
- `5: | 'InfrastructureError'`
- `6: | 'ApiError'`
- `11: export class BaseError extends Error {`
- `12: public readonly type: ErrorType;`
- `15: constructor(type: ErrorType, message: string, code?: string) {`
- `24: export class DomainError extends BaseError { constructor(msg: string) { super('DomainError', msg); } }`
- `25: export class ValidationError extends BaseError { constructor(msg: string) { super('ValidationError', msg); } }`
- `26: export class BusinessError extends BaseError { constructor(msg: string, code?: string) { super('BusinessError', msg, code); } }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
