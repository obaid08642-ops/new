# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/appointment-detail.tsx`
- **Member SHA-256:** `11c1bdd694b610cca1385e483a052518db3882940c50209d9b7d865c65bc0c70`
- **Line count:** 277
- **Read range:** `1-277`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router, useLocalSearchParams } from 'expo-router';`
- `13: export default function AppointmentDetailScreen() {`
- `71: <IconButton icon="back" onPress={() => router.back()} />`
- `86: onPress={() => router.push({ pathname: '/consultations/doctor/[id]', params: { id: appointment?.doctor_id || '1' } })}`
- `127: onPress={() => router.push({ pathname: '/consultations/summary', params: { appointmentId: appointment?.id } })}`
- `142: onPress={() => router.push({ pathname: '/reviews', params: { booking_kind: 'appointment', booking_id: appointment?.id, providerName: appointment?.doctor?.name || appointment?.doctor_name || '' } })}`
- `183: <Button label={AR ? 'عرض طلب التأمين والدفع الآمن' : 'Review insurance request and pay securely'} onPress={() => {`
- `186: const request = (requests || []).find((item: any) => item.booking_kind === 'consultation' && item.booking_id === appointment.id && ['PENDING_PROVIDER_REVIEW', 'APPROVED_FULL', 'COPAY_PENDING', 'COPAY_PAID'].includes(item.state));`
- `188: router.push({ pathname: '/insurance/payment-split', params: { request_id: request.id } });`
- `192: <Button variant="outline" label={AR ? 'إلغاء الموعد' : 'Cancel Appointment'} onPress={() => router.back()} />`
- `201: onPress={() => router.push({ pathname: '/consultations/cancel-reschedule', params: { appointmentId: appointment?.id } })}`
- `202: style={[styles.cancelBtn, { borderColor: colors.error } ]}>`
### backend_consumers_or_contracts
- `24: apiFetch<any>(`/care/appointments/${params.appointmentId}`)`
- `184: apiFetch<any[]>('/insurance/requests/my')`
- `188: router.push({ pathname: '/insurance/payment-split', params: { request_id: request.id } });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState, useEffect } from 'react';`
- `3: import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Modal, Alert } from 'react-native';`
- `18: const [appointment, setAppointment] = useState<any>(null);`
- `19: const [loading, setLoading] = useState(true);`
- `23: setLoading(true);`
- `29: setLoading(false);`
- `33: setLoading(false);`
- `37: if (loading) {`
- `67: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
- `75: {/* Status Banner */}`
- `76: <View colors={[colors.primary, colors.secondary]} style={styles.statusBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>`
- `77: <View style={[styles.statusIcon, { backgroundColor: 'rgba(255,255,255,0.2)' } ]}><Icon name="check_circle" size={24} color="#fff" /></View>`
### payment_insurance_relevance
- `8: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `61: { icon: 'card' as IconName, label: 'طريقة الدفع', value: appointment?.payment_method === 'insurance' ? 'تغطية تأمين' : appointment?.payment_method === 'cash' ? 'دفع نقدي' : 'بطاقة مدى/فيزا' },`
- `82: {/* Doctor Card */}`
- `83: <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 } ]}>`
- `101: <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 } ]}>`
- `114: {/* Price — shown only when a real amount exists on the appointment */}`
- `115: {(appointment?.price ?? appointment?.amount ?? null) != null && (`
- `116: <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 } ]}>`
- `117: <View style={styles.priceRow}>`
- `118: <AppText variant="h4" color={colors.primary}>{appointment.price ?? appointment.amount} ر.س</AppText>`
- `128: style={[styles.card, { backgroundColor: colors.primarySurface, borderColor: colors.primary, borderWidth: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }]}`
- `143: style={[styles.card, { backgroundColor: colors.surface, borderColor: '#F59E0B', borderWidth: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }]}`
### error_empty_loading_retry_cancel
- `19: const [loading, setLoading] = useState(true);`
- `23: setLoading(true);`
- `29: setLoading(false);`
- `31: .catch(() => {`
- `33: setLoading(false);`
- `37: if (loading) {`
- `172: {appointment?.status === 'PENDING_COPAY' && (`
- `186: const request = (requests || []).find((item: any) => item.booking_kind === 'consultation' && item.booking_id === appointment.id && ['PENDING_PROVIDER_REVIEW', 'APPROVED_FULL', 'COPAY_PENDING', 'COPAY_PAID'].includes(item.state));`
- `187: if (!request?.id) throw new Error('insurance_request_not_found');`
- `190: .catch(() => showLocalizedAlert(AR ? 'تعذر تحميل طلب التأمين' : 'Insurance request unavailable', AR ? 'لا يمكن تأكيد أو دفع التحمل من دون طلب تأمين مملوك ومراجع.' : 'A reviewed, owned insurance request is required before payment.'))`
- `192: <Button variant="outline" label={AR ? 'إلغاء الموعد' : 'Cancel Appointment'} onPress={() => router.back()} />`
- `201: onPress={() => router.push({ pathname: '/consultations/cancel-reschedule', params: { appointmentId: appointment?.id } })}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
