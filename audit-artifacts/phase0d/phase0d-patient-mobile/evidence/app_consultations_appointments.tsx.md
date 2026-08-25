# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/appointments.tsx`
- **Member SHA-256:** `c6144066411f0eff564346557570aadc78c5eaa7740a48c296bb8ac639fa51b6`
- **Line count:** 437
- **Read range:** `1-437`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import { router } from "expo-router";`
- `30: cancelled: { label: "ملغي", color: "#F0695C", bg: "#FEE2E2" },`
- `39: export default function AppointmentsScreen() {`
- `42: // Guests CAN view their bookings — backed by their device-bound guest account.`
- `62: : ["completed", "cancelled"].includes(a.status),`
- `78: <TouchableOpacity onPress={() => router.back()}>`
- `92: onPress={() => setTab(t)}`
- `138: onPress={() => fetchAppointments()}`
- `162: onPress={() => router.push("/(tabs)/consultations")}`
- `164: styles.bookNowBtn,`
- `186: onPress={() =>`
- `187: router.push({`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `10: RefreshControl,`
- `51: const [refreshing, setRefreshing] = useState(false);`
- `53: const handleRefresh = async () => {`
- `54: setRefreshing(true);`
- `56: setRefreshing(false);`
- `113: refreshControl={`
- `114: <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />`
### state_transitions
- `2: import React, { useState, useEffect } from "react";`
- `8: StatusBar,`
- `27: const STATUS = {`
- `28: confirmed: { label: "مؤكد", color: "#23B5CE", bg: "#EBF3FF" },`
- `29: completed: { label: "مكتمل", color: "#5BA84F", bg: "#DCFCE7" },`
- `30: cancelled: { label: "ملغي", color: "#F0695C", bg: "#FEE2E2" },`
- `31: pending: { label: "قيد المراجعة", color: "#F0A526", bg: "#FEF3C7" },`
- `44: const [tab, setTab] = useState<"upcoming" | "past">("upcoming");`
- `47: isLoading: loading,`
- `48: error,`
- `51: const [refreshing, setRefreshing] = useState(false);`
- `61: ? ["confirmed", "pending"].includes(a.status)`
### payment_insurance_relevance
- `19: Card,`
- `193: styles.apptCard,`
- `232: {item.price} ر.س`
- `364: apptCard: {`
- `404: apptPrice: { fontSize: 18, fontFamily: "Cairo-ExtraBold" },`
### error_empty_loading_retry_cancel
- `30: cancelled: { label: "ملغي", color: "#F0695C", bg: "#FEE2E2" },`
- `31: pending: { label: "قيد المراجعة", color: "#F0A526", bg: "#FEF3C7" },`
- `47: isLoading: loading,`
- `48: error,`
- `61: ? ["confirmed", "pending"].includes(a.status)`
- `62: : ["completed", "cancelled"].includes(a.status),`
- `117: loading ? (`
- `128: ) : error ? (`
- `132: color={colors.error}`
- `153: ListEmptyComponent={`
- `154: !loading && !error ? (`
- `155: <View style={styles.empty}>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
