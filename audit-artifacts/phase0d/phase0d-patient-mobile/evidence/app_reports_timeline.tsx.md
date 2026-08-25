# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/reports/timeline.tsx`
- **Member SHA-256:** `46a74fd6b9dab336e5b45e3bbffdc6e69e5d929f4a86f8f1c17e763c32ae480a`
- **Line count:** 292
- **Read range:** `1-292`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import { useRouter } from "expo-router";`
- `31: export default function MedicalTimelineScreen() {`
- `32: const router = useRouter();`
- `59: const handleDownload = (title: string) => {`
- `80: <IconButton icon="back" onPress={() => router.back()} />`
- `89: onPress={() => router.push("/reports/passport" as any)}`
- `117: onPress={() => setFilter(k)}`
- `207: onPress={() => handleDownload(item.title)}`
- `209: st.downloadBtn,`
- `217: name="download"`
- `282: downloadBtn: {`
### backend_consumers_or_contracts
- `43: const res = await apiFetch('/medical-reports/timeline');`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useState } from "react";`
- `9: StatusBar,`
- `35: const [filter, setFilter] = useState<TimelineCategory>("all");`
- `37: const [events, setEvents] = useState<any[]>([]);`
- `38: const [loading, setLoading] = useState(true);`
- `46: console.error(err);`
- `48: setLoading(false);`
- `67: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
- `125: <View style={st.empty}>`
- `248: empty: {`
### payment_insurance_relevance
- `18: Card,`
- `155: {/* Right Side: Card Details */}`
- `164: <Card`
- `166: st.eventCard,`
- `226: </Card>`
- `274: eventCard: { width: "100%", padding: 12, marginTop: 4 },`
### error_empty_loading_retry_cancel
- `38: const [loading, setLoading] = useState(true);`
- `45: } catch (err) {`
- `46: console.error(err);`
- `48: setLoading(false);`
- `125: <View style={st.empty}>`
- `248: empty: {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
