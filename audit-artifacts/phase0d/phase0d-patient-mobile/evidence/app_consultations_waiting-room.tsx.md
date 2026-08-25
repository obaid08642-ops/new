# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/waiting-room.tsx`
- **Member SHA-256:** `10526793f7fdf30c2fd0ae1d410d1e6c83ce48187ac2124e05f7d3dc6f8a5335`
- **Line count:** 323
- **Read range:** `1-323`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: import { router, useLocalSearchParams } from "expo-router";`
- `19: export default function WaitingRoomScreen() {`
- `87: onPress={() => router.back()}`
- `244: onPress={() => router.replace("/(tabs)/consultations")}`
### backend_consumers_or_contracts
- `31: apiFetch(`/care/appointments/${appointmentId}`)`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useEffect, useState } from "react";`
- `8: StatusBar,`
- `26: const [loading, setLoading] = useState(true);`
- `27: const [data, setData] = useState<any>(null);`
- `34: setLoading(false);`
- `38: setLoading(false);`
- `42: setLoading(false);`
- `46: if (loading)`
- `78: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
### payment_insurance_relevance
- `107: <View style={[styles.ticketCard, { backgroundColor: '#fff' }]}>`
- `265: ticketCard: {`
### error_empty_loading_retry_cancel
- `26: const [loading, setLoading] = useState(true);`
- `34: setLoading(false);`
- `36: .catch(() => {`
- `38: setLoading(false);`
- `42: setLoading(false);`
- `46: if (loading)`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
