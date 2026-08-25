# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/returns/detail.tsx`
- **Member SHA-256:** `b55465cf207aa9cdaf3cef9692c060809e806d993541cb1a017a83e8c13b5de4`
- **Line count:** 283
- **Read range:** `1-283`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: import { router, useLocalSearchParams } from "expo-router";`
- `39: const REFUND_LABELS: Record<string, string> = {`
- `45: export default function ReturnDetailScreen() {`
- `68: refund_method: "wallet",`
- `108: desc: `استرداد القيمة إلى: ${REFUND_LABELS[data?.refund_method as keyof typeof REFUND_LABELS] || "المحفظة"}`,`
- `118: <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>`
- `163: v: REFUND_LABELS[data?.refund_method] || "محفظة نبض",`
### backend_consumers_or_contracts
- `55: apiFetch<any>(`/pharmacy/returns/${returnId}`)`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState, useEffect } from "react";`
- `24: const STATUS_LABELS: Record<string, string> = {`
- `26: approved: "تم قبول الطلب",`
- `27: completed: " تم الاسترداد المالي",`
- `28: rejected: "طلب مرفوض",`
- `39: const REFUND_LABELS: Record<string, string> = {`
- `50: const [loading, setLoading] = useState(true);`
- `51: const [data, setData] = useState<any>(null);`
- `58: setLoading(false);`
- `61: // Load default empty state on error`
- `68: refund_method: "wallet",`
- `69: status: "processing",`
### payment_insurance_relevance
- `17: Card,`
- `36: insurance: "مطالبة تأمين",`
- `39: const REFUND_LABELS: Record<string, string> = {`
- `40: wallet: "محفظة نبض",`
- `41: card: "البطاقة الأصلية",`
- `68: refund_method: "wallet",`
- `108: desc: `استرداد القيمة إلى: ${REFUND_LABELS[data?.refund_method as keyof typeof REFUND_LABELS] || "المحفظة"}`,`
- `142: styles.card,`
- `163: v: REFUND_LABELS[data?.refund_method] || "محفظة نبض",`
- `188: styles.card,`
- `260: card: {`
### error_empty_loading_retry_cancel
- `50: const [loading, setLoading] = useState(true);`
- `58: setLoading(false);`
- `60: .catch(() => {`
- `61: // Load default empty state on error`
- `72: setLoading(false);`
- `76: if (loading) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
