# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/platform/auth/AuthStateMachine.ts`
- **Member SHA-256:** `296f40a1b17a5ab7db05b7c145f716c832dcdb4cbc25e1b575753866d3f0b646`
- **Line count:** 30
- **Read range:** `1-30`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: export type AuthState = 'Unauthenticated' | 'Authenticating' | 'Authenticated' | 'Locked' | 'Expired';`
- `5: export class AuthStateMachine {`
- `6: private log = logger.scope('AuthStateMachine');`
- `7: private currentState: AuthState = 'Unauthenticated';`
- `9: public getState(): AuthState {`
- `10: return this.currentState;`
- `13: public transition(newState: AuthState): void {`
- `14: const validTransitions: Record<AuthState, AuthState[]> = {`
- `22: if (validTransitions[this.currentState].includes(newState)) {`
- `23: this.log.info(`Auth State Transition: ${this.currentState} -> ${newState}`);`
- `24: this.currentState = newState;`
- `26: this.log.error(`Invalid Auth State Transition: ${this.currentState} -> ${newState}`);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `26: this.log.error(`Invalid Auth State Transition: ${this.currentState} -> ${newState}`);`
- `27: throw new Error(`Cannot transition auth state from ${this.currentState} to ${newState}`);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
