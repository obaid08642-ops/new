# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/navigation/DeepLinking.ts`
- **Member SHA-256:** `83edaa75bfd400ba46887b20e2e79da24da6089bfe5369a71083f8e47f400129`
- **Line count:** 73
- **Read range:** `1-73`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: * Deep Linking Configuration for Expo Router`
- `23: screens: {`
- `26: screens: {`
- `36: screens: {`
- `37: login: 'login',`
- `38: register: 'register',`
- `42: // Public discovery and share pages: the backend emits /s/:type/:slug.`
- `43: // The detail screen resolves the governed entity server-side and routes`
- `46: // Feature screens`
### backend_consumers_or_contracts
- `65: subscribe(listener: (url: string) => void) {`
### auth_ownership
- `37: login: 'login',`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `30: wallet: 'wallet',`
### error_empty_loading_retry_cancel
- `51: // Catch-all`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
