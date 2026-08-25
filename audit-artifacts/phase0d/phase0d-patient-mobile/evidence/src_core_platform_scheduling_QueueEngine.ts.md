# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/platform/scheduling/QueueEngine.ts`
- **Member SHA-256:** `bd4a38c8f71459cb054f0bc5b8a6beddcffd8370be5533b975daf5321775fbbd`
- **Line count:** 43
- **Read range:** `1-43`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: status: 'waiting' | 'in-consultation' | 'completed' | 'cancelled';`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: patientId: string;`
- `18: public async enqueue(providerId: string, patientId: string, priority: QueueEntry['priority']): Promise<QueueEntry> {`
- `19: this.log.info(`Patient ${patientId} joined queue for ${providerId} with priority ${priority}`);`
- `22: patientId,`
- `33: public async estimateWaitTime(providerId: string): Promise<number> {`
### state_transitions
- `9: status: 'waiting' | 'in-consultation' | 'completed' | 'cancelled';`
- `26: status: 'waiting',`
- `38: * Update the status of a patient in the queue.`
- `40: public async updateStatus(queueId: string, status: QueueEntry['status']): Promise<void> {`
- `41: this.log.info(`Queue ${queueId} status updated to ${status}`);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `9: status: 'waiting' | 'in-consultation' | 'completed' | 'cancelled';`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
