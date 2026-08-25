# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/diagnostics/order/[id].tsx`
- **Member SHA-256:** `72d16403e4e370024f2460b78f2007cade087a961e351a8736d3501724c30e98`
- **Line count:** 310
- **Read range:** `1-310`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: import { useLocalSearchParams, useRouter } from 'expo-router';`
- `18: const router = useRouter();`
- `23: const [canceling, setCanceling] = useState(false);`
- `30: // so this screen never loaded (eternal spinner). Try radiology then lab.`
- `35: const res = await apiFetch(`/radiology/bookings/${id}`);`
- `40: const res = await apiFetch(`/labs/bookings/${id}`);`
- `54: const handleCancel = async () => {`
- `56: { text: 'تراجع', style: 'cancel' },`
- `57: { text: 'نعم، إلغاء', style: 'destructive', onPress: async () => {`
- `58: setCanceling(true);`
- `61: const response = await apiFetch(`${base}/bookings/${id}/cancel`, { method: 'POST' });`
- `67: setCanceling(false);`
### backend_consumers_or_contracts
- `29: // E2 fix: was apiFetch('/orders/mine' + id) — a malformed URL that ALWAYS 404'd,`
- `35: const res = await apiFetch(`/radiology/bookings/${id}`);`
- `40: const res = await apiFetch(`/labs/bookings/${id}`);`
- `60: const base = kind === 'radiology' ? '/radiology' : '/labs';`
- `61: const response = await apiFetch(`${base}/bookings/${id}/cancel`, { method: 'POST' });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState, useEffect } from 'react';`
- `21: const [order, setOrder] = useState<any>(null);`
- `22: const [loading, setLoading] = useState(true);`
- `23: const [canceling, setCanceling] = useState(false);`
- `25: const [kind, setKind] = useState<'lab' | 'radiology' | null>(null);`
- `26: const [reload, setReload] = useState(0);`
- `48: setLoading(false);`
- `54: const handleCancel = async () => {`
- `56: { text: 'تراجع', style: 'cancel' },`
- `58: setCanceling(true);`
- `61: const response = await apiFetch(`${base}/bookings/${id}/cancel`, { method: 'POST' });`
- `67: setCanceling(false);`
### payment_insurance_relevance
- `74: // Never open a raw report/CDN URL supplied in a booking payload. A report is`
- `117: { key: 'PENDING_INSURANCE', label: 'التأمين' },`
- `127: PENDING_INSURANCE: 'NEW_REQUEST', WAITING_COPAY: 'NEW_REQUEST', IN_TRANSIT: 'CONFIRMED',`
- `148: <Animated.View entering={FadeInDown.duration(400)} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border } ]}>`
- `181: <Animated.View entering={FadeInDown.delay(100).duration(400)} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 0, overflow: 'hidden' } ]}>`
- `213: <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border } ]}>`
- `225: <View key={res.id} style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border } ]}>`
- `245: {/* Info Card */}`
- `246: <Animated.View entering={FadeInDown.delay(300).duration(400)} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border } ]}>`
- `258: <AppText style={{ color: colors.primary, fontWeight: 'bold', fontSize: 14 }}>{order.total ?? order.total_price ?? '—'} ر.س</AppText>`
- `263: {['NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY', 'sent', 'in_review'].includes(orderState) && !isCancelled && (`
- `291: card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },`
### error_empty_loading_retry_cancel
- `22: const [loading, setLoading] = useState(true);`
- `23: const [canceling, setCanceling] = useState(false);`
- `30: // so this screen never loaded (eternal spinner). Try radiology then lab.`
- `38: } catch { /* try lab */ }`
- `45: } catch (e) {`
- `48: setLoading(false);`
- `54: const handleCancel = async () => {`
- `56: { text: 'تراجع', style: 'cancel' },`
- `58: setCanceling(true);`
- `61: const response = await apiFetch(`${base}/bookings/${id}/cancel`, { method: 'POST' });`
- `64: } catch (e: any) {`
- `67: setCanceling(false);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
