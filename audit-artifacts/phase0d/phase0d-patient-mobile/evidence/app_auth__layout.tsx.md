# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(auth)/_layout.tsx`
- **Member SHA-256:** `087f5c5c950ff3a2cc9fa0c78c6e31f7e1d8ea7d31753a061e898cad8a20a516`
- **Line count:** 16
- **Read range:** `1-16`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: import { Stack } from "expo-router";`
- `6: screenOptions={{ headerShown: false, animation: "slide_from_right" }}`
- `8: <Stack.Screen name="welcome" />`
- `9: <Stack.Screen name="login" />`
- `10: <Stack.Screen name="register" />`
- `11: <Stack.Screen name="otp" />`
- `12: <Stack.Screen name="forgot-password" />`
- `13: <Stack.Screen name="reset-password" />`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `9: <Stack.Screen name="login" />`
- `11: <Stack.Screen name="otp" />`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
