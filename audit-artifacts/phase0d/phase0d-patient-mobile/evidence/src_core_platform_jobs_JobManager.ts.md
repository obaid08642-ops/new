# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/platform/jobs/JobManager.ts`
- **Member SHA-256:** `d5dc20dc8dd42e0df15654facd3b0e3844fb6517188417765383a2c36bcd0b01`
- **Line count:** 60
- **Read range:** `1-60`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying';`
- `11: retryCount: number;`
- `30: retryCount: 0,`
- `49: * Cancel a pending job`
- `51: public async cancel(jobId: string): Promise<boolean> {`
- `53: if (idx !== -1 && ['pending', 'retrying'].includes(this.jobs[idx].status)) {`
- `55: this.log.info(`Cancelled job: ${jobId}`);`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying';`
- `10: status: JobStatus;`
- `11: retryCount: number;`
- `29: status: 'pending',`
- `30: retryCount: 0,`
- `41: * Get the status of a specific job`
- `43: public async getJobStatus(jobId: string): Promise<JobStatus | null> {`
- `45: return job ? job.status : null;`
- `49: * Cancel a pending job`
- `51: public async cancel(jobId: string): Promise<boolean> {`
- `53: if (idx !== -1 && ['pending', 'retrying'].includes(this.jobs[idx].status)) {`
- `55: this.log.info(`Cancelled job: ${jobId}`);`
### payment_insurance_relevance
- `8: payload: any;`
- `23: public async enqueue(name: string, payload: any, priority: Job['priority'] = 'normal'): Promise<string> {`
- `27: payload,`
### error_empty_loading_retry_cancel
- `3: export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying';`
- `11: retryCount: number;`
- `29: status: 'pending',`
- `30: retryCount: 0,`
- `49: * Cancel a pending job`
- `51: public async cancel(jobId: string): Promise<boolean> {`
- `53: if (idx !== -1 && ['pending', 'retrying'].includes(this.jobs[idx].status)) {`
- `55: this.log.info(`Cancelled job: ${jobId}`);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
