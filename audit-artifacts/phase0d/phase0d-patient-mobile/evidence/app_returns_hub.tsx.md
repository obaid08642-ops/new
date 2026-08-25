# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/returns/hub.tsx`
- **Member SHA-256:** `5455f0c80d089b77004efcb360c08568879bfdad2ce981fd8e0866b78c2ef9d8`
- **Line count:** 407
- **Read range:** `1-407`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: import { router } from "expo-router";`
- `55: const REFUND_LABELS = {`
- `61: export default function ReturnsHubScreen() {`
- `88: refundMethod:`
- `89: REFUND_LABELS[r.refund_method as keyof typeof REFUND_LABELS] ||`
- `124: onPress={() => router.push("/returns/new-request")}`
- `132: <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>`
- `166: {/* Refund Policy Banner */}`
- `202: onPress={() => setFilter(key)}`
- `244: onPress={() =>`
- `245: router.push({`
- `289: إلى: {item.refundMethod}`
### backend_consumers_or_contracts
- `70: apiFetch<any[]>("/pharmacy/returns")`
### auth_ownership
- `232: <Icon name="refresh" size={20} color={colors.primary} />`
### state_transitions
- `2: import React, { useState, useEffect } from "react";`
- `8: StatusBar,`
- `25: const STATUS_CONFIG = {`
- `32: approved: {`
- `38: completed: {`
- `44: rejected: { label: "مرفوض", color: "#F0695C", bg: "#FEE2E2", icon: "error" },`
- `55: const REFUND_LABELS = {`
- `65: const [filter, setFilter] = useState("all");`
- `66: const [loading, setLoading] = useState(true);`
- `67: const [requests, setRequests] = useState<any[]>([]);`
- `81: status: r.status, // processing, approved, completed, rejected`
- `88: refundMethod:`
### payment_insurance_relevance
- `18: Card,`
- `42: icon: "wallet",`
- `52: insurance: "تأمين",`
- `55: const REFUND_LABELS = {`
- `56: wallet: "محفظة نبض",`
- `57: card: "البطاقة الأصلية",`
- `87: icon: r.service_type === "pharmacy" ? "pill" : "wallet",`
- `88: refundMethod:`
- `89: REFUND_LABELS[r.refund_method as keyof typeof REFUND_LABELS] ||`
- `114: const totalPending = requests`
- `139: { num: `${totalPending} ر`, label: "قيد الاسترداد" },`
- `166: {/* Refund Policy Banner */}`
### error_empty_loading_retry_cancel
- `44: rejected: { label: "مرفوض", color: "#F0695C", bg: "#FEE2E2", icon: "error" },`
- `66: const [loading, setLoading] = useState(true);`
- `100: setLoading(false);`
- `102: .catch(() => {`
- `103: setLoading(false);`
- `114: const totalPending = requests`
- `139: { num: `${totalPending} ر`, label: "قيد الاسترداد" },`
- `218: {loading ? (`
- `230: ListEmptyComponent={`
- `231: <View style={styles.empty}>`
- `367: empty: { alignItems: "center", paddingTop: 60, gap: 12 },`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
