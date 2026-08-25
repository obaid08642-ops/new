# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(onboarding)/_layout.tsx`
- **Member SHA-256:** `c749ff41bda4a9ac43e8231f978e69af965255a5870c113a948cae946c8ff3a5`
- **Line count:** 11
- **Read range:** `1-11`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: import { Stack } from "expo-router";`
- `5: <Stack screenOptions={{ headerShown: false, animation: "fade" }}>`
- `6: <Stack.Screen name="index" />`
- `7: <Stack.Screen name="language" />`
- `8: <Stack.Screen name="permissions" />`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `8: <Stack.Screen name="permissions" />`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
