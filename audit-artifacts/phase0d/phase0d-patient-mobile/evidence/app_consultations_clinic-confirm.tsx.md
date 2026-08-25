# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/clinic-confirm.tsx`
- **Member SHA-256:** `f12f8de2650cd84d925e48e7f66de91cc596548a3fa8e93f324468ac824e2acd`
- **Line count:** 199
- **Read range:** `1-199`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: import { router, useLocalSearchParams } from 'expo-router';`
- `16: import { ScreenState } from '../../src/components/ScreenStates';`
- `21: export default function ClinicConfirmScreen() {`
- `53: if (loading) return <ScreenState loading>{null}</ScreenState>;`
- `54: if (error && !appt) return <ScreenState error={error} onRetry={() => load()}>{null}</ScreenState>;`
- `55: if (!appt) return <ScreenState empty emptyTitle={AR ? 'الموعد غير موجود' : 'Appointment not found'}>{null}</ScreenState>;`
- `70: const bookingCode = String(appt.id || '').toUpperCase();`
- `74: router.push({ pathname: '/consultations/clinic-location', params: { appointmentId } });`
- `90: router.push({ pathname: '/consultations/chat-with-doctor', params: { doctorId: appt.doctor_user_id || appt.doctor_id, appointmentId } });`
- `93: const openCancelPolicy = () => {`
- `94: router.push({ pathname: '/consultations/cancel-reschedule', params: { appointmentId } });`
- `102: <AppText variant="h4">{AR ? 'تأكيد موعد العيادة' : 'Clinic Booking Confirmed'}</AppText>`
### backend_consumers_or_contracts
- `6: * المصادر: GET /appointments/:id · GET /care/doctors/:doctor_id`
- `38: const a = await apiFetch<any>(`/care/appointments/${appointmentId}`);`
### auth_ownership
- `9: import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Linking, Platform, Alert, RefreshControl } from 'react-native';`
- `30: const [refreshing, setRefreshing] = useState(false);`
- `33: const load = useCallback(async (isRefresh = false) => {`
- `35: if (isRefresh) setRefreshing(true); else setLoading(true);`
- `47: setRefreshing(false);`
- `110: refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}`
### state_transitions
- `8: import React, { useEffect, useState, useCallback } from 'react';`
- `9: import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Linking, Platform, Alert, RefreshControl } from 'react-native';`
- `16: import { ScreenState } from '../../src/components/ScreenStates';`
- `27: const [appt, setAppt] = useState<any>(null);`
- `28: const [doctor, setDoctor] = useState<any>(null);`
- `29: const [loading, setLoading] = useState(true);`
- `30: const [refreshing, setRefreshing] = useState(false);`
- `31: const [error, setError] = useState<string | null>(null);`
- `34: if (!appointmentId) { setError(AR ? 'معرّف الموعد مفقود' : 'Missing appointment id'); setLoading(false); return; }`
- `35: if (isRefresh) setRefreshing(true); else setLoading(true);`
- `36: setError(null);`
- `44: setError(e?.message || (AR ? 'تعذر تحميل بيانات الموعد' : 'Failed to load appointment'));`
### payment_insurance_relevance
- `15: import { AppText, Card, Button } from '../../src/components/ui';`
- `112: {/* QR / Barcode card */}`
- `113: <Card style={{ alignItems: 'center', gap: 10 }}>`
- `129: </Card>`
- `132: <Card style={{ gap: 10 }}>`
- `158: </Card>`
- `161: <Card style={{ gap: 8 }}>`
- `165: : ['Arrive 15 minutes early for check-in', 'Bring your national ID and insurance card if any', 'Bring previous lab or radiology results', 'Prepare a list of your current medications']`
- `172: </Card>`
- `175: <Card style={{ gap: 8, borderWidth: 1, borderColor: colors.borderLight }}>`
- `176: <AppText variant="h5" style={{ textAlign: 'right' }}>{AR ? 'سياسة الإلغاء والاسترداد' : 'Cancellation & refund policy'}</AppText>`
- `178: AR ? 'قبل الموعد بأكثر من 24 ساعة: استرداد 100%' : 'More than 24h before: 100% refund',`
### error_empty_loading_retry_cancel
- `29: const [loading, setLoading] = useState(true);`
- `31: const [error, setError] = useState<string | null>(null);`
- `34: if (!appointmentId) { setError(AR ? 'معرّف الموعد مفقود' : 'Missing appointment id'); setLoading(false); return; }`
- `35: if (isRefresh) setRefreshing(true); else setLoading(true);`
- `36: setError(null);`
- `41: try { setDoctor(await apiFetch<any>(`/care/doctors/${a.doctor_id}`)); } catch {}`
- `43: } catch (e: any) {`
- `44: setError(e?.message || (AR ? 'تعذر تحميل بيانات الموعد' : 'Failed to load appointment'));`
- `46: setLoading(false);`
- `53: if (loading) return <ScreenState loading>{null}</ScreenState>;`
- `54: if (error && !appt) return <ScreenState error={error} onRetry={() => load()}>{null}</ScreenState>;`
- `55: if (!appt) return <ScreenState empty emptyTitle={AR ? 'الموعد غير موجود' : 'Appointment not found'}>{null}</ScreenState>;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
