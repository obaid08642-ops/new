# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/services/EventBus.ts`
- **Member SHA-256:** `b89ed0a59cfc21baec4eac3267e3f7ae29861f81c2bbb4d32c26f4a6cd67f417`
- **Line count:** 38
- **Read range:** `1-38`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `9: subscribe(event: string, handler: EventHandler): () => void {`
- `15: // Return unsubscribe function`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `31: console.error(`[EventBus] Error in handler for event ${event}:`, e);`
### payment_insurance_relevance
- `4: type EventHandler = (payload: any) => void;`
- `24: publish(event: string, payload: any): void {`
- `29: handler(payload);`
### error_empty_loading_retry_cancel
- `30: } catch (e) {`
- `31: console.error(`[EventBus] Error in handler for event ${event}:`, e);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
