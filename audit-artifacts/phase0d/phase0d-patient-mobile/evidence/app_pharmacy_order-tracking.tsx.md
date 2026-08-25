# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/pharmacy/order-tracking.tsx`
- **Member SHA-256:** `dbc97efdff695a5df2e8bab953037aa712bf6566478206d234ff26c23c37c27b`
- **Line count:** 251
- **Read range:** `1-251`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: * Real-time order tracking screen.`
- `11: import { router, useLocalSearchParams } from 'expo-router';`
- `53: export default function OrderTrackingScreen() {`
- `100: onPress={() => router.replace('/(tabs)/pharmacy')}`
- `126: onPress={() => router.push('/pharmacy/chat-with-pharmacist')}`
- `206: onPress={() => router.push({ pathname: '/reviews', params: { booking_kind: 'pharmacy', booking_id: orderIdStr, providerName: orderData?.pharmacy_name || '' } })}`
- `241: export function ErrorBoundary({ error, retry }: any) {`
- `246: <TouchableOpacity onPress={retry} style={{ backgroundColor: '#23B5CE', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>`
### backend_consumers_or_contracts
- `3: * app/pharmacy/order-tracking.tsx`
- `5: * - Polls GET /orders/:orderId/tracking every 30 seconds.`
- `71: const data = await apiFetch(`/orders/${orderIdStr}/tracking`);`
- `82: fetch();`
- `100: onPress={() => router.replace('/(tabs)/pharmacy')}`
- `126: onPress={() => router.push('/pharmacy/chat-with-pharmacist')}`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `6: * - Displays dynamic timeline steps based on backend status and saved delivery mode.`
- `9: import React, { useState, useEffect } from 'react';`
- `28: const buildSteps = (state: string, updatedAt?: string, pharmacyName?: string, deliveryMode = 'DELIVERY'): TrackingStep[] => {`
- `31: const stateMap: Record<string, number> = {`
- `35: 'DELIVERED': 3,`
- `37: const currentLevel = stateMap[state] ?? 0;`
- `44: const ready = ['READY', 'READY_FOR_DISPATCH', 'ASSIGNED_TO_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(state);`
- `45: return [...initial, { id: 's3', title: 'جاهز للاستلام', desc: 'أصبح الطلب جاهزاً للاستلام من الصيدلية.', time: ready ? time(updatedAt || '') : '', done: ['DELIVERED', 'COMPLETED'].includes(state), active: ready && !['DELIVERED', 'COMPLETED'`
- `60: const [steps, setSteps] = useState<TrackingStep[]>([]);`
- `61: const [orderData, setOrderData] = useState<any>(null);`
- `62: const [fetchError, setFetchError] = useState(false);`
- `66: // ─── Poll tracking status ────────────────────────────────────────────────────`
### payment_insurance_relevance
- `7: * - Shows only backend-provided pharmacy, delivery, and total fields.`
- `91: const total = Number(orderData?.total);`
- `110: {/* Pharmacy Card */}`
- `111: <View style={[styles.pharmacyCard, { backgroundColor: '#DEF5F9', flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>`
- `189: <View style={[styles.summaryCard, { backgroundColor: colors.s, borderColor: colors.bd } ]}>`
- `194: { label: 'إجمالي الطلب', val: Number.isFinite(total) ? `${total.toFixed(2)} ر.س` : '—' },`
- `228: pharmacyCard: { padding: 16, borderRadius: 20, alignItems: 'center', marginBottom: 28 },`
- `237: summaryCard: { padding: 18, borderRadius: 20, borderWidth: 1 },`
### error_empty_loading_retry_cancel
- `62: const [fetchError, setFetchError] = useState(false);`
- `76: } catch {`
- `78: setFetchError(true);`
- `138: {fetchError ? 'تعذر تحميل حالة الطلب — سيعاد المحاولة تلقائياً' : 'جاري تحميل حالة الطلب…'}`
- `241: export function ErrorBoundary({ error, retry }: any) {`
- `245: <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 14, color: '#4C5566', textAlign: 'center', marginBottom: 20 }}>{error?.message || 'تعذر تحميل الصفحة'}</LocalizedText>`
- `246: <TouchableOpacity onPress={retry} style={{ backgroundColor: '#23B5CE', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
