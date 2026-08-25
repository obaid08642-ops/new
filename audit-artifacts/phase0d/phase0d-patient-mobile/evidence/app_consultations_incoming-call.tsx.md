# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/incoming-call.tsx`
- **Member SHA-256:** `886853a264f20abe032edda938b7f636680c6246c2111e083e2a7c1284a0795e`
- **Line count:** 161
- **Read range:** `1-161`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: import { router, useLocalSearchParams } from "expo-router";`
- `17: export default function IncomingCallScreen() {`
- `47: Vibration.cancel();`
- `53: Vibration.cancel();`
- `54: router.replace({`
- `61: Vibration.cancel();`
- `69: router.back();`
- `95: <TouchableOpacity onPress={handleReject} style={[st.btn, st.reject]}>`
- `100: <TouchableOpacity onPress={handleAccept} style={[st.btn, st.accept]}>`
### backend_consumers_or_contracts
- `64: await apiFetch(`/calls/${sessionId}/reject`, { method: "POST" });`
### auth_ownership
- `24: const sessionId = params.sessionId as string;`
- `50: }, [sessionId]);`
- `56: params: { sessionId, mode: callType },`
- `62: if (sessionId) {`
- `64: await apiFetch(`/calls/${sessionId}/reject`, { method: "POST" });`
### state_transitions
- `2: import React, { useEffect, useState } from "react";`
- `6: StatusBar,`
- `27: const [ringTime, setRingTime] = useState(0);`
- `47: Vibration.cancel();`
- `53: Vibration.cancel();`
- `61: Vibration.cancel();`
- `74: <StatusBar barStyle="light-content" />`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `38: // Timeout call after 35 seconds of ringing`
- `47: Vibration.cancel();`
- `53: Vibration.cancel();`
- `61: Vibration.cancel();`
- `65: } catch (err) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
