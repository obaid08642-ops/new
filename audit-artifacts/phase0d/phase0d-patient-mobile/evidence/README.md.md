# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `README.md`
- **Member SHA-256:** `62b3c5652d31c99d21000c39b165143e927260af38d25060c1a30ef5130d945b`
- **Line count:** 63
- **Read range:** `1-63`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `41: | `expo-router` | `~4.0.20` ← v4 NOT v5 |`
- `63: ### 📱 141 Screens across 27 feature groups`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `27: The error `Cannot find module 'react-native-worklets/plugin'` was caused by:`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `27: The error `Cannot find module 'react-native-worklets/plugin'` was caused by:`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
