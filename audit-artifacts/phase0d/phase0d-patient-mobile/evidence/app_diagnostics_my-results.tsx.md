# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/diagnostics/my-results.tsx`
- **Member SHA-256:** `83e331a3961dc9ffaf03da4f219516f9fa92ef83f43d648e71dacb2260bbbaf2`
- **Line count:** 202
- **Read range:** `1-202`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: import { router } from "expo-router";`
- `17: export default function MyResultsScreen() {`
- `20: const [bookings, setBookings] = useState<any[]>([]);`
- `28: apiFetch<any[]>("/labs/bookings/mine").catch(() => []),`
- `32: setBookings([...(labs || []), ...radItems]);`
- `59: <IconButton icon="back" onPress={() => router.back()} />`
- `68: ) : bookings.length === 0 ? (`
- `86: {bookings.map((b) => {`
- `108: } else if (b.state === "CANCELLED") {`
- `140: onPress={() => router.push({ pathname: "/diagnostics/order/[id]", params: { id: b.id } })}`
### backend_consumers_or_contracts
- `28: apiFetch<any[]>("/labs/bookings/mine").catch(() => []),`
- `29: apiFetch<any[]>("/radiology/reports/mine").catch(() => []),`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState, useEffect } from "react";`
- `7: StatusBar,`
- `20: const [bookings, setBookings] = useState<any[]>([]);`
- `21: const [loading, setLoading] = useState(true);`
- `25: setLoading(true);`
- `34: console.log("Error loading results", err);`
- `36: setLoading(false);`
- `46: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
- `62: {loading ? (`
- `98: // Map backend state`
- `99: let statusText = "قيد المراجعة";`
- `102: if (b.state === "REPORTED") {`
### payment_insurance_relevance
- `14: import { AppText, Card, Badge, IconButton } from "../../src/components/ui";`
- `138: <Card`
- `176: </Card>`
### error_empty_loading_retry_cancel
- `21: const [loading, setLoading] = useState(true);`
- `25: setLoading(true);`
- `28: apiFetch<any[]>("/labs/bookings/mine").catch(() => []),`
- `29: apiFetch<any[]>("/radiology/reports/mine").catch(() => []),`
- `33: } catch (err) {`
- `34: console.log("Error loading results", err);`
- `36: setLoading(false);`
- `62: {loading ? (`
- `108: } else if (b.state === "CANCELLED") {`
- `110: badgeColor = colors.error;`
- `120: } else if (b.state === "PENDING") {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
