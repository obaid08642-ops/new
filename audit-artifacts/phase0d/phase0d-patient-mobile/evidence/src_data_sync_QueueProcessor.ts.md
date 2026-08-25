# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/data/sync/QueueProcessor.ts`
- **Member SHA-256:** `42938e9b7537ef6ba470d9a478b3ffbf63831d2c84da7510c25c708e183aee56`
- **Line count:** 76
- **Read range:** `1-76`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: import { RetryScheduler } from './RetryScheduler';`
- `10: retry_count: number;`
- `18: private retryScheduler: RetryScheduler;`
- `23: this.retryScheduler = new RetryScheduler();`
- `32: INSERT INTO sync_queue (id, operation, entity_type, payload, status, retry_count, created_at, updated_at)`
- `45: WHERE status = 'PENDING' OR (status = 'FAILED' AND retry_count < 5)`
- `54: * Updates job status and increments retry count if failed.`
- `56: async updateJobStatus(jobId: string, status: ISyncJob['status'], incrementRetry: boolean = false): Promise<void> {`
- `60: if (incrementRetry) {`
- `61: sql += `, retry_count = retry_count + 1`;`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import { RetryScheduler } from './RetryScheduler';`
- `9: status: 'PENDING' | 'PROCESSING' | 'FAILED' | 'COMPLETED';`
- `10: retry_count: number;`
- `18: private retryScheduler: RetryScheduler;`
- `23: this.retryScheduler = new RetryScheduler();`
- `32: INSERT INTO sync_queue (id, operation, entity_type, payload, status, retry_count, created_at, updated_at)`
- `33: VALUES (?, ?, ?, ?, 'PENDING', 0, ?, ?)`
- `40: * Fetches pending or eligible failed jobs from the queue.`
- `42: async getPendingJobs(): Promise<ISyncJob[]> {`
- `45: WHERE status = 'PENDING' OR (status = 'FAILED' AND retry_count < 5)`
- `54: * Updates job status and increments retry count if failed.`
- `56: async updateJobStatus(jobId: string, status: ISyncJob['status'], incrementRetry: boolean = false): Promise<void> {`
### payment_insurance_relevance
- `8: payload: string;`
- `29: async enqueue(operation: string, entityType: string, payload: any): Promise<void> {`
- `32: INSERT INTO sync_queue (id, operation, entity_type, payload, status, retry_count, created_at, updated_at)`
- `36: await this.dbManager.driver.executeSql(sql, [id, operation, entityType, JSON.stringify(payload), now, now]);`
### error_empty_loading_retry_cancel
- `2: import { RetryScheduler } from './RetryScheduler';`
- `9: status: 'PENDING' | 'PROCESSING' | 'FAILED' | 'COMPLETED';`
- `10: retry_count: number;`
- `14: * Processes the offline sync queue table, ensuring jobs are executed sequentially or safely in parallel.`
- `18: private retryScheduler: RetryScheduler;`
- `23: this.retryScheduler = new RetryScheduler();`
- `32: INSERT INTO sync_queue (id, operation, entity_type, payload, status, retry_count, created_at, updated_at)`
- `33: VALUES (?, ?, ?, ?, 'PENDING', 0, ?, ?)`
- `40: * Fetches pending or eligible failed jobs from the queue.`
- `42: async getPendingJobs(): Promise<ISyncJob[]> {`
- `45: WHERE status = 'PENDING' OR (status = 'FAILED' AND retry_count < 5)`
- `54: * Updates job status and increments retry count if failed.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
