# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/integration/EventBusIntegrator.ts`
- **Member SHA-256:** `4e9cdc5b2455a633ec4b8ed5c731741029dd227caa6ae78de15021f5a6955e65`
- **Line count:** 43
- **Read range:** `1-43`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `4: import { baseApi } from '../api/baseApi';`
- `16: eventBus.subscribe('ENTITY_INSERTED', (event) => {`
- `23: eventBus.subscribe('ENTITY_UPDATED', (event) => {`
- `31: eventBus.subscribe('ENTITY_DELETED', (event) => {`
- `38: eventBus.subscribe('SYNC_COMPLETED', (event) => {`
### auth_ownership
- `39: log.debug('SYNC_COMPLETED triggered, refreshing UI');`
### state_transitions
- `38: eventBus.subscribe('SYNC_COMPLETED', (event) => {`
- `39: log.debug('SYNC_COMPLETED triggered, refreshing UI');`
- `41: store.dispatch(baseApi.util.resetApiState());`
### payment_insurance_relevance
- `17: log.debug(`ENTITY_INSERTED triggered for module: ${event.sourceModule}`, event.payload);`
- `24: log.debug(`ENTITY_UPDATED triggered for module: ${event.sourceModule}`, event.payload);`
- `26: store.dispatch(baseApi.util.invalidateTags([{ type: event.sourceModule as any, id: event.payload.id }]));`
- `32: log.debug(`ENTITY_DELETED triggered for module: ${event.sourceModule}`, event.payload);`
- `33: store.dispatch(baseApi.util.invalidateTags([{ type: event.sourceModule as any, id: event.payload.id }]));`
### error_empty_loading_retry_cancel
- `8: * to the Redux Store, so that offline database changes trigger UI updates.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
