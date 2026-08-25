# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `package.json`
- **Member SHA-256:** `905a0867304253b329652a41b6ccf58d7f0fe47424f6912ca4efb99d813b73f4`
- **Line count:** 81
- **Read range:** `1-81`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `26: "axios-retry": "^4.5.0",`
- `45: "expo-router": "~6.0.24",`
- `47: "expo-splash-screen": "~31.0.13",`
- `57: "react-native-screens": "~4.16.0",`
### backend_consumers_or_contracts
- `25: "axios": "^1.7.9",`
- `26: "axios-retry": "^4.5.0",`
- `63: "socket.io-client": "^4.8.3",`
- `72: "axios-mock-adapter": "^2.1.0",`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `26: "axios-retry": "^4.5.0",`
- `48: "expo-status-bar": "~3.0.9",`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `26: "axios-retry": "^4.5.0",`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
