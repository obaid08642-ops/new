# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/services/Logger.ts`
- **Member SHA-256:** `3fb03340017146ebdd5504f7e0abe6112e2cbab467eb359fce3274f4af35b26a`
- **Line count:** 152
- **Read range:** `1-152`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `25: 'password', 'token', 'refreshToken', 'accessToken',`
- `26: 'secret', 'apiKey', 'authorization', 'pin', 'otp',`
### state_transitions
- `9: export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';`
- `54: debug: 0, info: 1, warn: 2, error: 3, none: 4,`
- `87: const logFn = level === 'error' ? console.error`
- `122: error(message: string, data?: unknown, context?: string): void {`
- `123: this.log('error', message, data, context);`
- `145: error(msg: string, data?: unknown) { this.parent.error(msg, data, this.context); }`
### payment_insurance_relevance
- `27: 'nationalId', 'cardNumber', 'cvv', 'iban',`
### error_empty_loading_retry_cancel
- `9: export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';`
- `54: debug: 0, info: 1, warn: 2, error: 3, none: 4,`
- `87: const logFn = level === 'error' ? console.error`
- `105: try { sink(entry); } catch { /* never throw from logger */ }`
- `122: error(message: string, data?: unknown, context?: string): void {`
- `123: this.log('error', message, data, context);`
- `145: error(msg: string, data?: unknown) { this.parent.error(msg, data, this.context); }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
