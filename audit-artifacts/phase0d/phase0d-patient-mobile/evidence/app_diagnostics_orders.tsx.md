# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/diagnostics/orders.tsx`
- **Member SHA-256:** `5af2776c75b457e5175c7bb1089dbf64de21f89234725c0cd7489ef686029271`
- **Line count:** 363
- **Read range:** `1-363`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: import { useRouter } from "expo-router";`
- `21: const router = useRouter();`
- `31: apiFetch("/labs/bookings/mine").catch(() => null),`
- `32: apiFetch("/radiology/bookings/mine").catch(() => null),`
- `62: (o) => !["ready", "cancelled"].includes(o.status),`
- `65: ["ready", "cancelled"].includes(o.status),`
- `74: case "cancelled":`
- `91: case "cancelled":`
- `113: <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>`
- `148: onPress={() => setTab("current")}`
- `167: onPress={() => setTab("past")}`
- `212: onPress={() =>`
### backend_consumers_or_contracts
- `31: apiFetch("/labs/bookings/mine").catch(() => null),`
- `32: apiFetch("/radiology/bookings/mine").catch(() => null),`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState, useEffect } from "react";`
- `22: const [tab, setTab] = useState<"current" | "past">("current");`
- `23: const [orders, setOrders] = useState<any[]>([]);`
- `24: const [loading, setLoading] = useState(true);`
- `37: status: (b.state || '').toLowerCase(),`
- `45: status: (b.state || b.status || '').toLowerCase(),`
- `55: setLoading(false);`
- `62: (o) => !["ready", "cancelled"].includes(o.status),`
- `65: ["ready", "cancelled"].includes(o.status),`
- `70: const getStatusColor = (status: string) => {`
- `71: switch (status) {`
- `74: case "cancelled":`
### payment_insurance_relevance
- `40: total: b.total,`
- `48: total: b.total,`
- `206: styles.orderCard,`
- `293: {order.total} ر.س`
- `329: orderCard: {`
### error_empty_loading_retry_cancel
- `24: const [loading, setLoading] = useState(true);`
- `31: apiFetch("/labs/bookings/mine").catch(() => null),`
- `32: apiFetch("/radiology/bookings/mine").catch(() => null),`
- `51: } catch (e) {`
- `55: setLoading(false);`
- `62: (o) => !["ready", "cancelled"].includes(o.status),`
- `65: ["ready", "cancelled"].includes(o.status),`
- `74: case "cancelled":`
- `91: case "cancelled":`
- `181: {loading ? (`
- `188: <View style={styles.emptyWrap}>`
- `328: emptyWrap: { alignItems: "center", justifyContent: "center", marginTop: 100 },`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
