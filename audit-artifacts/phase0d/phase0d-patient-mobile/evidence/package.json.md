# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `package.json`
- **Member SHA-256:** `e52b8f6bcce400bee37ef689a664a0a8b956c4bd2a414054dc2e151661ec2d4d`
- **Line count:** 142
- **Read range:** `1-142`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: "main": "expo-router/entry",`
- `56: "expo-router": "~57.0.14",`
- `59: "expo-splash-screen": "~57.0.7",`
- `86: "react-native-screens": "~4.26.0",`
### backend_consumers_or_contracts
- `29: "axios": "^1.7.9",`
- `94: "socket.io-client": "^4.8.3",`
### auth_ownership
- `37: "expo-auth-session": "~57.0.7",`
- `127: "tough-cookie": "^4.1.3",`
- `139: "tough-cookie": "^4.1.3",`
### state_transitions
- `61: "expo-status-bar": "~57.0.1",`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
