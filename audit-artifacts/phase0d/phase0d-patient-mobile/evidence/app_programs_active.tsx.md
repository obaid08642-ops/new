# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/programs/active.tsx`
- **Member SHA-256:** `7fb2f438eba2f5abfc89ab038e37328fcecb5b03b2e5e8f08117ae502e6aeb3f`
- **Line count:** 224
- **Read range:** `1-224`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { useRouter } from 'expo-router';`
- `29: export default function ActiveProgramsScreen() {`
- `30: const router = useRouter();`
- `67: { text: 'إلغاء', style: 'cancel' },`
- `70: onPress: async () => {`
- `99: <IconButton icon="back" onPress={() => router.back()} />`
- `104: <IconButton icon="sparkles" onPress={() => router.push('/loyalty/hub' as any)} />`
- `114: onPress={() => setActiveTab(p.id)}`
- `160: <Button label="تأكيد الحضور أو إعادة الجدولة" variant="outline" size="sm" style={{ marginTop: 12 }} onPress={() => showLocalizedAlert('التأكيد', 'تم تأكيد موعد حضورك بنجاح.')} />`
- `184: onPress={() => !isCompleted && handleMarkCompleted(session.id)}`
### backend_consumers_or_contracts
- `44: const res = await apiFetch('/medical/programs/active');`
- `72: const res = await apiFetch('/medical/programs/complete-session', {`
### auth_ownership
- `18: completedSessions: 0,`
- `19: totalSessions: 6,`
- `20: nextSessionDate: 'غير محدد',`
- `21: nextSessionTime: '09:00 ص',`
- `22: nextSessionTitle: 'الاستشارة التأسيسية لغدد الصماء',`
- `25: sessionsList: []`
- `62: const handleMarkCompleted = (sessionId: number) => {`
- `72: const res = await apiFetch('/medical/programs/complete-session', {`
- `74: body: JSON.stringify({ programType: activeTab, sessionId: sessionId.toString() })`
- `79: if (sessionId === 4) {`
- `137: {selectedProg.completedSessions} من أصل {selectedProg.totalSessions} جلسات`
- `141: <View style={[st.barFill, { backgroundColor: colors.primary, width: `${(selectedProg.completedSessions / selectedProg.totalSessions) * 100}%` }]} />`
### state_transitions
- `3: import React, { useState } from 'react';`
- `4: import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';`
- `18: completedSessions: 0,`
- `33: const [programs, setPrograms] = useState<any[]>([]);`
- `34: const [activeTab, setActiveTab] = useState<string>('diabetes');`
- `35: const [loading, setLoading] = useState(true);`
- `43: setLoading(true);`
- `56: setLoading(false);`
- `62: const handleMarkCompleted = (sessionId: number) => {`
- `67: { text: 'إلغاء', style: 'cancel' },`
- `84: console.error(err);`
- `95: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
### payment_insurance_relevance
- `9: import { AppText, Card, Badge, Button, IconButton, SectionHeader } from '../../src/components/ui';`
- `19: totalSessions: 6,`
- `125: {/* Progress Card */}`
- `126: <Card style={st.progressCard}>`
- `137: {selectedProg.completedSessions} من أصل {selectedProg.totalSessions} جلسات`
- `141: <View style={[st.barFill, { backgroundColor: colors.primary, width: `${(selectedProg.completedSessions / selectedProg.totalSessions) * 100}%` }]} />`
- `144: </Card>`
- `147: <Card style={[st.nextSessionCard, { backgroundColor: colors.primarySurface, borderColor: colors.primary + '30' } ]}>`
- `161: </Card>`
- `164: <Card style={st.rewardCard}>`
- `175: </Card>`
- `182: <Card`
### error_empty_loading_retry_cancel
- `35: const [loading, setLoading] = useState(true);`
- `43: setLoading(true);`
- `53: } catch (e) {`
- `56: setLoading(false);`
- `67: { text: 'إلغاء', style: 'cancel' },`
- `83: } catch (err) {`
- `84: console.error(err);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
