# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(auth)/forgot-password.tsx`
- **Member SHA-256:** `cb286af3fb406bb73ecce2253c1fdddaf9629a04f8ae2131454412e318479ef7`
- **Line count:** 155
- **Read range:** `1-155`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: import { router } from "expo-router";`
- `22: export default function ForgotPasswordScreen() {`
- `38: router.push({`
- `70: onPress={() => router.back()}`
- `118: onPress={handleSend}`
- `124: onPress={() => router.back()}`
### backend_consumers_or_contracts
- `33: await apiFetch('/auth/send-otp', {`
### auth_ownership
- `22: export default function ForgotPasswordScreen() {`
- `33: await apiFetch('/auth/send-otp', {`
- `39: pathname: '/(auth)/otp',`
### state_transitions
- `2: import React, { useState } from "react";`
- `6: StatusBar,`
- `25: const [email, setEmail] = useState("");`
- `26: const [loading, setLoading] = useState(false);`
- `31: setLoading(true);`
- `37: setLoading(false);`
- `47: setLoading(false);`
- `56: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
- `117: loading={loading}`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `26: const [loading, setLoading] = useState(false);`
- `31: setLoading(true);`
- `37: setLoading(false);`
- `45: } catch (err: any) {`
- `47: setLoading(false);`
- `117: loading={loading}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
