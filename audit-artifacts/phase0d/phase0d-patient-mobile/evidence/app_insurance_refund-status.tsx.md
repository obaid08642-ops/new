# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/insurance/refund-status.tsx`
- **Member SHA-256:** `dc86528f1844c45dc362e785f252ef0a69e014880ed9d0d19933e7ed4b359bde`
- **Line count:** 145
- **Read range:** `1-145`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router } from "expo-router";`
- `26: export default function InsuranceRefundScreen() {`
- `29: const [refunds, setRefunds] = useState<any[]>([]);`
- `33: apiFetch('/refunds/my')`
- `34: .then((res: any) => setRefunds(Array.isArray(res) ? res : []))`
- `35: .catch(() => setRefunds([]))`
- `39: const items = refunds.map((r: any) => {`
- `43: service: r.reason || r.booking_id || "طلب استرداد",`
- `44: amount: r.refund_amount ?? r.amount_paid ?? null,`
- `61: <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>`
### backend_consumers_or_contracts
- `33: apiFetch('/refunds/my')`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useEffect, useState } from "react";`
- `18: const STATE_MAP: any = {`
- `20: APPROVED: { label: "تمت الموافقة", color: "#23B5CE" },`
- `22: REJECTED: { label: "مرفوض", color: "#F0695C" },`
- `23: FAILED: { label: "فشل التنفيذ", color: "#F0695C" },`
- `26: export default function InsuranceRefundScreen() {`
- `29: const [refunds, setRefunds] = useState<any[]>([]);`
- `30: const [loading, setLoading] = useState(true);`
- `33: apiFetch('/refunds/my')`
- `34: .then((res: any) => setRefunds(Array.isArray(res) ? res : []))`
- `35: .catch(() => setRefunds([]))`
- `36: .finally(() => setLoading(false));`
### payment_insurance_relevance
- `10: Card,`
- `26: export default function InsuranceRefundScreen() {`
- `29: const [refunds, setRefunds] = useState<any[]>([]);`
- `33: apiFetch('/refunds/my')`
- `34: .then((res: any) => setRefunds(Array.isArray(res) ? res : []))`
- `35: .catch(() => setRefunds([]))`
- `39: const items = refunds.map((r: any) => {`
- `44: amount: r.refund_amount ?? r.amount_paid ?? null,`
- `79: styles.card,`
- `132: card: {`
### error_empty_loading_retry_cancel
- `23: FAILED: { label: "فشل التنفيذ", color: "#F0695C" },`
- `30: const [loading, setLoading] = useState(true);`
- `35: .catch(() => setRefunds([]))`
- `36: .finally(() => setLoading(false));`
- `69: {!loading && items.length === 0 && (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
