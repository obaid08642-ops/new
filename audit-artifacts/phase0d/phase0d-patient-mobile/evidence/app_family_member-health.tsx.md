# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/family/member-health.tsx`
- **Member SHA-256:** `318a6f6962ad969de2bdf13871b94baa5e93e68bd2f0cb654263b94f0ab0dc99`
- **Line count:** 317
- **Read range:** `1-317`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: import { router, useLocalSearchParams } from "expo-router";`
- `29: export default function MemberHealthScreen() {`
- `152: onPress={() =>`
- `153: router.push({`
- `170: onPress={() => router.back()}`
- `282: onPress={() => router.push("/family/chat")}`
- `288: onPress={() => router.push("/(tabs)/consultations")}`
### backend_consumers_or_contracts
- `49: const res = await apiFetch(`/family/member-records/${memberId}`);`
### auth_ownership
- `48: // Granular, permission-filtered bundle — sections appear only when granted`
- `105: // Honest failure: no permission or network — show empty state, not dummy data`
- `154: pathname: "/family/permissions",`
### state_transitions
- `2: import React, { useState, useEffect } from "react";`
- `7: StatusBar,`
- `38: const [member, setMember] = useState<any>(null);`
- `39: const [loading, setLoading] = useState(true);`
- `47: setLoading(true);`
- `60: status: "مسجّلة",`
- `67: status: "مسجّلة",`
- `74: status: "مسجّلة",`
- `105: // Honest failure: no permission or network — show empty state, not dummy data`
- `106: console.error("Could not fetch family member health details:", err);`
- `116: setLoading(false);`
- `120: if (loading) {`
### payment_insurance_relevance
- `16: Card,`
- `210: <Card key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>`
- `219: </Card>`
- `228: <Card`
- `247: </Card>`
- `254: <Card`
- `272: </Card>`
### error_empty_loading_retry_cancel
- `39: const [loading, setLoading] = useState(true);`
- `47: setLoading(true);`
- `104: } catch (err) {`
- `105: // Honest failure: no permission or network — show empty state, not dummy data`
- `106: console.error("Could not fetch family member health details:", err);`
- `116: setLoading(false);`
- `120: if (loading) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
