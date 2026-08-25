# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(onboarding)/permissions.tsx`
- **Member SHA-256:** `2d6f2cf481cfda507ab2a3691275ff598f1b0ea443ac74cebd405941906389d5`
- **Line count:** 220
- **Read range:** `1-220`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: import { router } from "expo-router";`
- `51: export default function PermissionsScreen() {`
- `74: router.replace("/(auth)/welcome");`
- `101: onPress={() => handleGrant(perm.id)}`
- `173: onPress={handleContinue}`
- `175: <TouchableOpacity onPress={handleContinue} style={{ marginTop: 8 }}>`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `19: const PERMISSIONS: {`
- `51: export default function PermissionsScreen() {`
- `95: {PERMISSIONS.map((perm) => {`
### state_transitions
- `2: import React, { useState } from "react";`
- `7: StatusBar,`
- `54: const [granted, setGranted] = useState<Set<string>>(new Set());`
- `55: const [isLoading, setIsLoading] = useState(false);`
- `67: setIsLoading(true);`
- `73: setIsLoading(false);`
- `79: <StatusBar barStyle="light-content" />`
- `172: loading={isLoading}`
### payment_insurance_relevance
- `17: import { AppText, Card, Button, IconButton } from "../../src/components/ui";`
- `103: <Card`
- `105: st.permCard,`
- `152: </Card>`
- `203: permCard: { borderWidth: 1, borderColor: "transparent" },`
### error_empty_loading_retry_cancel
- `55: const [isLoading, setIsLoading] = useState(false);`
- `67: setIsLoading(true);`
- `70: } catch (_err) {`
- `73: setIsLoading(false);`
- `172: loading={isLoading}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
