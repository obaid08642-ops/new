# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/pharmacy/order-history.tsx`
- **Member SHA-256:** `031c7b56c87d31562da6621a73bd7249274985c8f0b3d52f2f061daad492e0b6`
- **Line count:** 338
- **Read range:** `1-338`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: import { router } from "expo-router";`
- `24: export default function OrderHistoryScreen() {`
- `44: CANCELLED: { label: "ملغي", color: "#F0695C", bg: "#FEEFED" },`
- `108: router.push("/pharmacy/cart");`
- `126: <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>`
- `148: { id: "CANCELLED", label: "ملغي" },`
- `152: onPress={() => setActiveFilter(f.id)}`
- `196: onPress={() =>`
- `197: router.push({`
- `263: onPress={() => handleReorder(item.items)}`
### backend_consumers_or_contracts
- `52: const res = await apiFetch("/orders/mine");`
- `108: router.push("/pharmacy/cart");`
- `198: pathname: "/pharmacy/order-tracking",`
### auth_ownership
- `10: RefreshControl,`
- `37: const [refreshing, setRefreshing] = useState(false);`
- `48: const loadOrders = async (isRefresh = false) => {`
- `50: if (isRefresh) setRefreshing(true);`
- `85: setRefreshing(false);`
- `178: refreshControl={`
- `179: <RefreshControl`
- `180: refreshing={refreshing}`
- `181: onRefresh={() => loadOrders(true)}`
### state_transitions
- `2: import React, { useState, useEffect } from "react";`
- `8: StatusBar,`
- `34: const [activeFilter, setActiveFilter] = useState("all");`
- `35: const [orders, setOrders] = useState<any[]>([]);`
- `36: const [loading, setLoading] = useState(true);`
- `37: const [refreshing, setRefreshing] = useState(false);`
- `39: const STATUS_CONFIG: Record<`
- `43: DELIVERED: { label: "تم التوصيل", color: "#2BB89C", bg: "#E2F7F2" },`
- `44: CANCELLED: { label: "ملغي", color: "#F0695C", bg: "#FEEFED" },`
- `45: PENDING: { label: "قيد التنفيذ", color: "#F0A526", bg: "#FEF4E0" },`
- `51: else setLoading(true);`
- `74: status: o.state || "PENDING",`
### payment_insurance_relevance
- `70: price: i.price || 0,`
- `73: total: o.total || o.subtotal || 0,`
- `103: price: i.price,`
- `203: styles.orderCard,`
- `280: <LocalizedText style={[styles.orderTotal, { color: "#23B5CE" }]}>`
- `281: {item.total}`
- `320: orderCard: { borderRadius: 24, borderWidth: 1, padding: 16 },`
- `335: orderTotal: { fontFamily: "Cairo-Black", fontSize: 22 },`
### error_empty_loading_retry_cancel
- `36: const [loading, setLoading] = useState(true);`
- `44: CANCELLED: { label: "ملغي", color: "#F0695C", bg: "#FEEFED" },`
- `45: PENDING: { label: "قيد التنفيذ", color: "#F0A526", bg: "#FEF4E0" },`
- `51: else setLoading(true);`
- `74: status: o.state || "PENDING",`
- `81: } catch {`
- `84: setLoading(false);`
- `148: { id: "CANCELLED", label: "ملغي" },`
- `186: loading ? (`
- `193: const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG["PENDING"];`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
