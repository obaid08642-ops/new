# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/data/sync/RetryScheduler.ts`
- **Member SHA-256:** `c97b1b0c75693cd8f46c402559f90c64703934a3824324a2400cd05075fbda7b`
- **Line count:** 36
- **Read range:** `1-36`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: export class RetryScheduler {`
- `16: * Calculates the delay for the next retry using exponential backoff with jitter.`
- `18: calculateNextDelay(retryCount: number): number {`
- `19: if (retryCount >= this.maxRetries) {`
- `23: // Exponential backoff: base * 2^retry`
- `24: const backoff = this.baseDelayMs * Math.pow(2, retryCount);`
- `33: shouldRetry(retryCount: number): boolean {`
- `34: return retryCount < this.maxRetries;`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: * Manages exponential backoff strategies for failed sync jobs.`
- `4: export class RetryScheduler {`
- `16: * Calculates the delay for the next retry using exponential backoff with jitter.`
- `18: calculateNextDelay(retryCount: number): number {`
- `19: if (retryCount >= this.maxRetries) {`
- `23: // Exponential backoff: base * 2^retry`
- `24: const backoff = this.baseDelayMs * Math.pow(2, retryCount);`
- `33: shouldRetry(retryCount: number): boolean {`
- `34: return retryCount < this.maxRetries;`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `2: * Manages exponential backoff strategies for failed sync jobs.`
- `4: export class RetryScheduler {`
- `16: * Calculates the delay for the next retry using exponential backoff with jitter.`
- `18: calculateNextDelay(retryCount: number): number {`
- `19: if (retryCount >= this.maxRetries) {`
- `23: // Exponential backoff: base * 2^retry`
- `24: const backoff = this.baseDelayMs * Math.pow(2, retryCount);`
- `33: shouldRetry(retryCount: number): boolean {`
- `34: return retryCount < this.maxRetries;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
