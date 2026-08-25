# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/booking-pending.tsx`
- **Member SHA-256:** `ec8a97de6bfb93c5ee2b7cb451915e8e4a834754e627a768eac021edec8a7a19`
- **Line count:** 215
- **Read range:** `1-215`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: *  - CANCELLED → إشعار استرداد حسب سياسة الإلغاء`
- `11: import { router, useLocalSearchParams } from 'expo-router';`
- `22: export default function BookingPendingScreen() {`
- `33: const [cancelling, setCancelling] = useState(false);`
- `48: const routeAccepted = useCallback((a: any) => {`
- `52: router.replace({ pathname: '/consultations/clinic-confirm', params: { appointmentId: id } });`
- `54: router.replace({ pathname: '/consultations/home-visit-tracking', params: { appointmentId: id } });`
- `56: router.replace({ pathname: '/consultations/virtual-waiting-room', params: { appointmentId: id } });`
- `70: setTimeout(() => routeAccepted(res), 1400);`
- `71: } else if (['CANCELLED', 'NO_SHOW'].includes(st)) {`
- `77: }, [appointmentId, AR, routeAccepted]);`
- `97: const handleCancel = () => {`
### backend_consumers_or_contracts
- `4: * يستطلع GET /appointments/:id كل 5 ثوانٍ حتى:`
- `63: const res = await apiFetch<any>(`/care/appointments/${appointmentId}`);`
- `108: await apiFetch(`/care/appointments/${appointmentId}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason: 'patient_cancelled_while_waiting' }) });`
### auth_ownership
- `75: setLoadErr(e?.message || (AR ? 'تعذر تحديث الحالة' : 'Failed to refresh status'));`
- `204: <AppText variant="labelSM" color={colors.primary}>{AR ? 'تحديث الحالة الآن' : 'Refresh status now'}</AppText>`
### state_transitions
- `5: *  - CONFIRMED → توجيه حسب نوع الخدمة (عيادة/منزل/فيديو) بمعرّف الموعد الحقيقي`
- `6: *  - CANCELLED → إشعار استرداد حسب سياسة الإلغاء`
- `9: import React, { useEffect, useRef, useState, useCallback } from 'react';`
- `10: import { View, StyleSheet, Animated, StatusBar, TouchableOpacity, Alert, Easing } from 'react-native';`
- `22: export default function BookingPendingScreen() {`
- `30: const [appt, setAppt] = useState<any>(null);`
- `31: const [loadErr, setLoadErr] = useState<string | null>(null);`
- `32: const [elapsed, setElapsed] = useState(0); // seconds`
- `33: const [cancelling, setCancelling] = useState(false);`
- `34: const [phase, setPhase] = useState<'waiting' | 'accepted' | 'rejected'>('waiting');`
- `67: const st = res.status;`
- `68: if (['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(st)) {`
### payment_insurance_relevance
- `15: import { AppText, Button, Card } from '../../src/components/ui';`
- `100: AR ? 'سيُلغى الحجز ويُسترد المبلغ حسب سياسة الإلغاء (100% قبل 24 ساعة). هل أنت متأكد؟' : 'The booking will be cancelled and refunded per policy (100% before 24h). Are you sure?',`
- `134: : 'The provider declined or the appointment was cancelled. Any charged amount will be fully refunded within 3–5 business days.'}`
- `183: <Card style={{ marginTop: 18, borderColor: colors.warning || '#FF9500', borderWidth: 1 }}>`
- `187: : 'The wait exceeded the usual time. You can keep waiting or cancel with a full refund.'}`
- `189: </Card>`
- `199: label={cancelling ? (AR ? 'جارٍ الإلغاء…' : 'Cancelling…') : (AR ? 'إلغاء الحجز واسترداد المبلغ' : 'Cancel & refund')}`
### error_empty_loading_retry_cancel
- `6: *  - CANCELLED → إشعار استرداد حسب سياسة الإلغاء`
- `22: export default function BookingPendingScreen() {`
- `33: const [cancelling, setCancelling] = useState(false);`
- `70: setTimeout(() => routeAccepted(res), 1400);`
- `71: } else if (['CANCELLED', 'NO_SHOW'].includes(st)) {`
- `74: } catch (e: any) {`
- `75: setLoadErr(e?.message || (AR ? 'تعذر تحديث الحالة' : 'Failed to refresh status'));`
- `97: const handleCancel = () => {`
- `99: AR ? 'إلغاء الحجز' : 'Cancel booking',`
- `100: AR ? 'سيُلغى الحجز ويُسترد المبلغ حسب سياسة الإلغاء (100% قبل 24 ساعة). هل أنت متأكد؟' : 'The booking will be cancelled and refunded per policy (100% before 24h). Are you sure?',`
- `102: { text: AR ? 'تراجع' : 'Back', style: 'cancel' },`
- `104: text: AR ? 'نعم، إلغاء' : 'Yes, cancel', style: 'destructive',`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
