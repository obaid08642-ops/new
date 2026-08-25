# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/follow-up.tsx`
- **Member SHA-256:** `b70c204551cc70c4b0c8c5603252815c9db1bd09be581f93707a2982a9b72b77`
- **Line count:** 208
- **Read range:** `1-208`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router, useLocalSearchParams } from 'expo-router';`
- `20: CANCELLED: 'ملغاة',`
- `21: RESCHEDULED: 'أُعيد جدولتها',`
- `25: export default function FollowUpScreen() {`
- `74: <IconButton icon="back" onPress={() => router.back()} />`
- `86: {loadError && <Button label="إعادة المحاولة" variant="primary" icon="refresh" onPress={load} />}`
- `87: <Button label="عودة" variant="ghost" onPress={() => router.back()} />`
- `118: {/* Patient notes recorded at booking */}`
- `147: onPress={() => router.push('/(tabs)/pharmacy')}`
- `184: onPress={() => router.push({ pathname: '/consultations/chat-with-doctor', params: { doctorId: appt.doctor_id } } as any)}`
- `192: onPress={() => router.push({ pathname: '/consultations/book/[id]', params: { id: appt.doctor_id } } as any)}`
### backend_consumers_or_contracts
- `2: // app/consultations/follow-up.tsx — متابعة الاستشارة: بيانات الموعد الحقيقية من /care/appointments/:id`
- `41: const data = await apiFetch(`/care/appointments/${encodeURIComponent(appointmentId)}`);`
- `49: apiFetch(`/care/doctors/${encodeURIComponent(a.doctor_id)}`)`
- `147: onPress={() => router.push('/(tabs)/pharmacy')}`
### auth_ownership
- `86: {loadError && <Button label="إعادة المحاولة" variant="primary" icon="refresh" onPress={load} />}`
### state_transitions
- `3: import React, { useState } from 'react';`
- `4: import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';`
- `14: const STATE_AR: Record<string, string> = {`
- `15: PENDING: 'بانتظار التأكيد',`
- `16: CONFIRMED: 'مؤكد',`
- `19: COMPLETED: 'مكتملة',`
- `20: CANCELLED: 'ملغاة',`
- `22: NO_SHOW: 'لم يحضر',`
- `31: const [appt, setAppt] = useState<any>(null);`
- `32: const [doctorName, setDoctorName] = useState('');`
- `33: const [loading, setLoading] = useState(true);`
- `34: const [loadError, setLoadError] = useState(false);`
### payment_insurance_relevance
- `9: import { AppText, Card, Badge, Button, IconButton, SectionHeader } from '../../src/components/ui';`
- `93: <Card style={{ flexDirection: 'row-reverse', gap: 12, alignItems: 'center' }}>`
- `108: </Card>`
- `111: <Card>`
- `116: </Card>`
- `120: <Card>`
- `123: </Card>`
- `127: <Card>`
- `151: </Card>`
- `164: <Card style={{ flex: 1, marginBottom: 4 }}>`
- `172: </Card>`
### error_empty_loading_retry_cancel
- `15: PENDING: 'بانتظار التأكيد',`
- `20: CANCELLED: 'ملغاة',`
- `33: const [loading, setLoading] = useState(true);`
- `34: const [loadError, setLoadError] = useState(false);`
- `37: if (!appointmentId) { setLoadError(true); setLoading(false); return; }`
- `38: setLoading(true);`
- `39: setLoadError(false);`
- `45: setLoadError(true);`
- `51: .catch(() => {});`
- `54: } catch {`
- `56: setLoadError(true);`
- `58: setLoading(false);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
