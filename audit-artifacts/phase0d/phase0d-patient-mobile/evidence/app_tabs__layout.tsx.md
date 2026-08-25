# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(tabs)/_layout.tsx`
- **Member SHA-256:** `7f6e60ef5ad8b7bae8fda7e0ffb5921c5e17b3f41dc6c98ebaee75f7711a4f0a`
- **Line count:** 26
- **Read range:** `1-26`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { Tabs } from 'expo-router';`
- `10: screenOptions={{`
- `17: <Tabs.Screen name="index" />`
- `18: <Tabs.Screen name="consultations/index" />`
- `19: <Tabs.Screen name="pharmacy" />`
- `20: <Tabs.Screen name="diagnostics" />`
- `21: <Tabs.Screen name="services" />`
- `22: <Tabs.Screen name="health" />`
- `23: <Tabs.Screen name="nursing" options={{ href: null }} />`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
