# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/data/sync/SyncManager.ts`
- **Member SHA-256:** `b835b298d9a84b6084c5b5422118eb4d6f1bbbc99b572d1eb62961862c6c7adf`
- **Line count:** 70
- **Read range:** `1-70`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `22: // Subscribe to Domain Events to trigger sync automatically`
- `23: EventBus.subscribe('entity.created', (event) => this.handleLocalMutation('CREATE', event.entityType, event.payload));`
- `24: EventBus.subscribe('entity.updated', (event) => this.handleLocalMutation('UPDATE', event.entityType, event.payload));`
- `25: EventBus.subscribe('entity.deleted', (event) => this.handleLocalMutation('DELETE', event.entityType, { id: event.id, soft: event.soft }));`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `37: throw new Error('SyncManager not initialized. Call initialize(dbManager) first.');`
- `67: console.error('[SyncManager] Background sync failed', e);`
### payment_insurance_relevance
- `23: EventBus.subscribe('entity.created', (event) => this.handleLocalMutation('CREATE', event.entityType, event.payload));`
- `24: EventBus.subscribe('entity.updated', (event) => this.handleLocalMutation('UPDATE', event.entityType, event.payload));`
- `53: public async handleLocalMutation(operation: string, entityType: string, payload: any): Promise<void> {`
- `54: await this.queueProcessor.enqueue(operation, entityType, payload);`
### error_empty_loading_retry_cancel
- `9: * High-level manager orchestrating Offline-First Synchronization.`
- `37: throw new Error('SyncManager not initialized. Call initialize(dbManager) first.');`
- `66: this.worker.startProcessing().catch(e => {`
- `67: console.error('[SyncManager] Background sync failed', e);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
