# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/data/database/monitoring/SyncLogger.ts`
- **Member SHA-256:** `0956e0ecccce43f5c71d4c651d5cf3bfc4c59ab068fd46a33cdda7e2c61ba246`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `18: static logJobRetry(jobId: string, attempt: number, nextRetryAt: number) {`
- `19: logger.warn(`Sync Job Retrying`, { jobId, attempt, nextRetryAt }, this.TAG);`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `5: * Tracks sync queue, conflict resolutions, and background job statuses.`
- `14: static logSyncCompleted(processed: number, failed: number, durationMs: number) {`
- `15: logger.info(`Background Sync Completed (${durationMs}ms)`, { processed, failed }, this.TAG);`
- `18: static logJobRetry(jobId: string, attempt: number, nextRetryAt: number) {`
- `19: logger.warn(`Sync Job Retrying`, { jobId, attempt, nextRetryAt }, this.TAG);`
- `22: static logJobFailed(jobId: string, error: any) {`
- `23: logger.error(`Sync Job Failed Permanently`, { error, jobId }, this.TAG);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `14: static logSyncCompleted(processed: number, failed: number, durationMs: number) {`
- `15: logger.info(`Background Sync Completed (${durationMs}ms)`, { processed, failed }, this.TAG);`
- `18: static logJobRetry(jobId: string, attempt: number, nextRetryAt: number) {`
- `19: logger.warn(`Sync Job Retrying`, { jobId, attempt, nextRetryAt }, this.TAG);`
- `22: static logJobFailed(jobId: string, error: any) {`
- `23: logger.error(`Sync Job Failed Permanently`, { error, jobId }, this.TAG);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
