# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/data/sync/SyncWorker.ts`
- **Member SHA-256:** `f0fee7bb184a9d775e30c80f3d60f96050779b6d9ea4aae036fc4f843c6c7978`
- **Line count:** 71
- **Read range:** `1-71`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: * Delegates actual network operations to registered handlers (usually RemoteDataSources).`
- `19: * Registers a handler for a specific entity type (e.g., 'users' -> userRemoteDataSource.sync)`
- `21: registerHandler(entityType: string, handler: SyncHandler): void {`
- `54: console.error(`[SyncWorker] No handler registered for entity type: ${job.entity_type}`);`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `33: let pendingJobs = await this.queue.getPendingJobs();`
- `35: while (pendingJobs.length > 0) {`
- `36: for (const job of pendingJobs) {`
- `41: pendingJobs = await this.queue.getPendingJobs();`
- `44: await this.queue.clearCompletedJobs();`
- `54: console.error(`[SyncWorker] No handler registered for entity type: ${job.entity_type}`);`
- `55: await this.queue.updateJobStatus(job.id, 'FAILED', true);`
- `60: await this.queue.updateJobStatus(job.id, 'PROCESSING');`
- `65: await this.queue.updateJobStatus(job.id, 'COMPLETED');`
- `66: } catch (error) {`
- `67: console.error(`[SyncWorker] Job ${job.id} failed`, error);`
- `68: await this.queue.updateJobStatus(job.id, 'FAILED', true);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `33: let pendingJobs = await this.queue.getPendingJobs();`
- `35: while (pendingJobs.length > 0) {`
- `36: for (const job of pendingJobs) {`
- `41: pendingJobs = await this.queue.getPendingJobs();`
- `54: console.error(`[SyncWorker] No handler registered for entity type: ${job.entity_type}`);`
- `55: await this.queue.updateJobStatus(job.id, 'FAILED', true);`
- `66: } catch (error) {`
- `67: console.error(`[SyncWorker] Job ${job.id} failed`, error);`
- `68: await this.queue.updateJobStatus(job.id, 'FAILED', true);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
