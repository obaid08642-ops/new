# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/events/EventBus.ts`
- **Member SHA-256:** `99cf832ddcae38dc957da787f6a03093f5d46873a4f170fe8651c2e5c590874a`
- **Line count:** 59
- **Read range:** `1-59`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `18: * Subscribe to a domain event`
- `20: public subscribe(eventName: string, handler: EventHandler): () => void {`
- `26: // Return unsubscribe function`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `53: } catch (error) {`
- `54: this.log.error(`Error in event handler for ${eventName}`, error);`
### payment_insurance_relevance
- `7: payload: T;`
- `35: public publish<T>(eventName: string, payload: T, sourceModule: string): void {`
- `40: payload,`
### error_empty_loading_retry_cancel
- `50: setTimeout(async () => {`
- `53: } catch (error) {`
- `54: this.log.error(`Error in event handler for ${eventName}`, error);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
