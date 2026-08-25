# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/cancel-reschedule.tsx`
- **Member SHA-256:** `bd00d43ece07dc3afc6919b7f70372e585c7498fc392b4fb97262624e89676c2`
- **Line count:** 325
- **Read range:** `1-325`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router, useLocalSearchParams } from 'expo-router';`
- `13: const CANCEL_REASONS = [`
- `24: export default function CancelRescheduleScreen() {`
- `30: const [mode, setMode] = useState<'choose' | 'cancel' | 'reschedule'>('choose');`
- `61: // Load real availability for the next 7 days when entering reschedule mode`
- `63: if (mode !== 'reschedule' || !appointment?.doctor_id) return;`
- `87: const refundPct = hoursUntil == null ? null : hoursUntil >= 24 ? 100 : hoursUntil >= 12 ? 50 : 0;`
- `104: if (mode === 'cancel') {`
- `105: await apiFetch(`/care/appointments/${appointmentId}/cancel`, {`
- `109: showLocalizedAlert('تم الإلغاء', refundPct && refundPct > 0 && price > 0`
- `110: ? `تم إلغاء الموعد. سيُعاد ${refundPct}% من قيمة الحجز وفق سياسة الاسترداد.``
- `112: { text: 'حسناً', onPress: () => router.replace('/consultations/appointments') },`
### backend_consumers_or_contracts
- `50: const data = await apiFetch<any>(`/care/appointments/${appointmentId}`);`
- `105: await apiFetch(`/care/appointments/${appointmentId}/cancel`, {`
- `112: { text: 'حسناً', onPress: () => router.replace('/consultations/appointments') },`
- `118: await apiFetch(`/care/appointments/${appointmentId}/reschedule`, {`
- `123: { text: 'حسناً', onPress: () => router.replace('/consultations/appointments') },`
### auth_ownership
- `191: <TouchableOpacity onPress={() => setMode('reschedule')} style={styles.rescheduleBtn} accessibilityRole="button">`
- `199: <TouchableOpacity onPress={() => setMode('cancel')} style={[styles.cancelBtn, { borderColor: colors.error }]} accessibilityRole="button">`
- `213: <TouchableOpacity key={r} onPress={() => setSelectedReason(r)} accessibilityRole="radio" accessibilityState={{ selected: selectedReason === r }}`
### state_transitions
- `2: import React, { useEffect, useMemo, useState } from 'react';`
- `3: import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native';`
- `13: const CANCEL_REASONS = [`
- `24: export default function CancelRescheduleScreen() {`
- `30: const [mode, setMode] = useState<'choose' | 'cancel' | 'reschedule'>('choose');`
- `31: const [appointment, setAppointment] = useState<any>(null);`
- `32: const [loadingAppt, setLoadingAppt] = useState(true);`
- `33: const [loadError, setLoadError] = useState<string | null>(null);`
- `35: const [selectedReason, setSelectedReason] = useState('');`
- `36: const [slotsByDay, setSlotsByDay] = useState<Record<string, any[]>>({});`
- `37: const [slotsLoading, setSlotsLoading] = useState(false);`
- `38: const [selectedSlot, setSelectedSlot] = useState<any>(null);`
### payment_insurance_relevance
- `84: const price = Number(appointment?.price ?? appointment?.amount_total ?? 0);`
- `87: const refundPct = hoursUntil == null ? null : hoursUntil >= 24 ? 100 : hoursUntil >= 12 ? 50 : 0;`
- `109: showLocalizedAlert('تم الإلغاء', refundPct && refundPct > 0 && price > 0`
- `110: ? `تم إلغاء الموعد. سيُعاد ${refundPct}% من قيمة الحجز وفق سياسة الاسترداد.``
- `178: <View style={[styles.policyCard, { backgroundColor: isDark ? colors.surface : colors.white }]}>`
- `181: { range: 'قبل 24 ساعة', refund: 'استرداد 100%', color: '#5BA84F' },`
- `182: { range: 'قبل 12-24 ساعة', refund: 'استرداد 50%', color: '#F0A526' },`
- `183: { range: 'أقل من 12 ساعة', refund: 'لا يوجد استرداد', color: '#F0695C' },`
- `186: <AppText variant="bodySM">{p.refund}</AppText>`
- `221: {refundPct != null && price > 0 && (`
- `222: <View style={[styles.refundNote, { backgroundColor: '#FEF3C7' }]}>`
- `224: {refundPct > 0`
### error_empty_loading_retry_cancel
- `13: const CANCEL_REASONS = [`
- `24: export default function CancelRescheduleScreen() {`
- `30: const [mode, setMode] = useState<'choose' | 'cancel' | 'reschedule'>('choose');`
- `32: const [loadingAppt, setLoadingAppt] = useState(true);`
- `33: const [loadError, setLoadError] = useState<string | null>(null);`
- `37: const [slotsLoading, setSlotsLoading] = useState(false);`
- `39: const [isLoading, setIsLoading] = useState(false);`
- `43: setLoadError('لم يتم تحديد الموعد');`
- `44: setLoadingAppt(false);`
- `47: setLoadingAppt(true);`
- `48: setLoadError(null);`
- `52: } catch (e: any) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
