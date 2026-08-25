# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/insurance/submit-claim.tsx`
- **Member SHA-256:** `10394928e5bf67cd556b30b943ca91097ca0fa57aabe835abf17a89976265025`
- **Line count:** 185
- **Read range:** `1-185`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: // app/insurance/submit-claim.tsx — Connected to insurance module`
- `5: import { router } from "expo-router";`
- `19: export default function Screen() {`
- `22: const [submitting, setSubmitting] = useState(false);`
- `24: const submitClaim = async (type: string) => {`
- `25: setSubmitting(true);`
- `27: await apiFetch("/insurance/claims/submit", {`
- `32: submitted_at: new Date().toISOString(),`
- `39: setSubmitting(false);`
- `68: onPress={() => router.back()}`
- `78: onPress={() => submitClaim("consultation")}`
- `97: onPress={() => submitClaim("pharmacy")}`
### backend_consumers_or_contracts
- `2: // app/insurance/submit-claim.tsx — Connected to insurance module`
- `27: await apiFetch("/insurance/claims/submit", {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useState } from "react";`
- `4: import { View, StyleSheet, ScrollView, StatusBar, Alert } from "react-native";`
- `22: const [submitting, setSubmitting] = useState(false);`
- `31: status: "pending",`
- `45: <StatusBar barStyle="light-content" />`
### payment_insurance_relevance
- `2: // app/insurance/submit-claim.tsx — Connected to insurance module`
- `11: Card,`
- `27: await apiFetch("/insurance/claims/submit", {`
- `77: <Card`
- `95: </Card>`
- `96: <Card`
- `114: </Card>`
- `115: <Card`
- `133: </Card>`
- `134: <Card`
- `152: </Card>`
- `172: balanceCard: {`
### error_empty_loading_retry_cancel
- `31: status: "pending",`
- `36: } catch {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
