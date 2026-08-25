# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/family/join.tsx`
- **Member SHA-256:** `5ac39d837d45443013f6c2a06b081b4e754186d0482e09a8a09ad10e3c66a714`
- **Line count:** 251
- **Read range:** `1-251`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router, useLocalSearchParams } from "expo-router";`
- `29: export default function FamilyJoinScreen() {`
- `99: onPress={() => router.replace("/health/family-hub")}`
- `121: <IconButton icon="back" onPress={() => router.back()} />`
- `166: onPress={lookupCode}`
- `172: onPress={() => router.push("/family/scan")}`
- `218: onPress={accept}`
- `224: onPress={() => router.back()}`
### backend_consumers_or_contracts
- `44: const res = await apiFetch("/family/join", {`
### auth_ownership
- `56: permissions: [],`
- `194: {found.permissions.map((p: string, i: number) => (`
### state_transitions
- `3: import React, { useState } from "react";`
- `4: import { View, StyleSheet, StatusBar } from "react-native";`
- `33: const [code, setCode] = useState((params.code as string) || "");`
- `34: const [relation, setRelation] = useState("");`
- `35: const [loading, setLoading] = useState(false);`
- `36: const [found, setFound] = useState<any>(null);`
- `37: const [joined, setJoined] = useState(false);`
- `41: setLoading(true);`
- `63: setLoading(false);`
- `86: <View style={[st.icon, { backgroundColor: colors.successSurface }]}>`
- `87: <Icon name="check_circle" size={48} color={colors.success} />`
- `108: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
### payment_insurance_relevance
- `11: Card,`
- `177: <Card style={{ alignItems: "center", gap: 12 }}>`
- `188: </Card>`
- `190: <Card>`
- `210: </Card>`
### error_empty_loading_retry_cancel
- `35: const [loading, setLoading] = useState(false);`
- `41: setLoading(true);`
- `60: } catch (err: any) {`
- `63: setLoading(false);`
- `165: loading={loading}`
- `217: loading={loading}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
