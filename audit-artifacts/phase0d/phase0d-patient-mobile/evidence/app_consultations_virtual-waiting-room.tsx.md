# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/virtual-waiting-room.tsx`
- **Member SHA-256:** `05666fdd4d35d42e8f15760158df9e42a2aed36a95ac43dda9616dbeaebc842e`
- **Line count:** 272
- **Read range:** `1-272`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import { router, useLocalSearchParams } from "expo-router";`
- `19: export default function VirtualWaitingRoomScreen() {`
- `83: <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>`
- `187: onPress={() =>`
- `188: router.push({`
### backend_consumers_or_contracts
- `47: apiFetch(`/care/appointments/${appointmentId}`)`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useEffect, useRef, useState } from "react";`
- `8: StatusBar,`
- `25: const [loading, setLoading] = useState(true);`
- `26: const [data, setData] = useState<any>(null);`
- `50: setLoading(false);`
- `54: setLoading(false);`
- `58: setLoading(false);`
- `62: if (loading)`
- `80: <StatusBar barStyle="light-content" />`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `25: const [loading, setLoading] = useState(true);`
- `50: setLoading(false);`
- `52: .catch(() => {`
- `54: setLoading(false);`
- `58: setLoading(false);`
- `62: if (loading)`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
