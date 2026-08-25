# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(auth)/reset-password.tsx`
- **Member SHA-256:** `59bf083db507abd79d5745e68e62fbb7953920a5cf780b897e86fb16139e7359`
- **Line count:** 169
- **Read range:** `1-169`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: import { router, useLocalSearchParams } from "expo-router";`
- `19: export default function ResetPasswordScreen() {`
- `77: onPress={() => router.replace("/(auth)/login")}`
- `102: <IconButton icon="back" onPress={() => router.back()} />`
- `137: onPress={handleReset}`
### backend_consumers_or_contracts
- `34: await apiFetch("/auth/reset-password", {`
### auth_ownership
- `77: onPress={() => router.replace("/(auth)/login")}`
### state_transitions
- `2: import React, { useState } from "react";`
- `6: StatusBar,`
- `24: const [pw, setPw] = useState("");`
- `25: const [confirmPw, setConfirmPw] = useState("");`
- `26: const [show, setShow] = useState(false);`
- `27: const [loading, setLoading] = useState(false);`
- `28: const [done, setDone] = useState(false);`
- `32: setLoading(true);`
- `41: setLoading(false);`
- `45: setLoading(false);`
- `63: style={[st.iconCircle, { backgroundColor: colors.successSurface }]}`
- `65: <Icon name="check_circle" size={40} color={colors.success} />`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `27: const [loading, setLoading] = useState(false);`
- `32: setLoading(true);`
- `41: setLoading(false);`
- `43: } catch (err: any) {`
- `45: setLoading(false);`
- `129: error={confirmPw && pw !== confirmPw ? "غير متطابقتين" : ""}`
- `136: loading={loading}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
