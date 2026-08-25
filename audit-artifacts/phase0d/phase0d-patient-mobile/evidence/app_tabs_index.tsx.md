# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(tabs)/index.tsx`
- **Member SHA-256:** `e8aacaa6054fed454843a28ebc482f760efab61ca4bee93a7ebbee89895cb2dc`
- **Line count:** 119
- **Read range:** `1-119`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router, useFocusEffect } from 'expo-router';`
- `22: export default function HealthDayScreen() {`
- `76: <IconButton icon="notification" bg="rgba(255,255,255,0.15)" color="#FFFFFF" onPress={() => router.push('/notifications')} />`
- `78: <IconButton icon="person" bg="rgba(255,255,255,0.15)" color="#FFFFFF" onPress={() => router.push('/profile')} />`
- `85: {hasError ? <Card style={[styles.error, { backgroundColor: colors.warningSurface, borderColor: colors.warning + '50' }]}><AppText variant="caption" color={colors.textPrimary} align="right">{t('error')}</AppText><TouchableOpacity accessibili`
- `89: <Quick icon="consultations" color="#2E86FF" label={t('consultation')} onPress={() => router.push('/(tabs)/consultations')} colors={colors} />`
- `90: <Quick icon="pharmacy" color="#16A34A" label={t('pharmacy')} onPress={() => router.push('/(tabs)/pharmacy')} colors={colors} />`
- `91: <Quick icon="science" color="#7A6BEA" label={t('diagnostics')} onPress={() => router.push('/(tabs)/diagnostics')} colors={colors} />`
- `92: <Quick icon="emergency" color="#DC2626" label={t('emergency')} onPress={() => router.push('/emergency/sos')} colors={colors} />`
- `93: <Quick icon="heart-pulse" color="#23B5CE" label={t('profile')} onPress={() => router.push('/(tabs)/health')} colors={colors} />`
- `94: <Quick icon="brain" color="#7A6BEA" label={t('safeTriage')} onPress={() => router.push('/ai/triage')} colors={colors} />`
- `97: <Section title={t('medications')} action={t('manageReminders')} onAction={() => router.push('/health/medication-reminder-list')} colors={colors} />`
### backend_consumers_or_contracts
- `41: apiFetch('/users/me/profile'), apiFetch('/health/reminders'), apiFetch('/nutrition/daily-summary'),`
- `42: apiFetch('/maternity/profile'), apiFetch('/mental-health/mood?days=1'), apiFetch('/health/vitals/summary'), apiFetch('/home/upcoming-appointment'),`
- `76: <IconButton icon="notification" bg="rgba(255,255,255,0.15)" color="#FFFFFF" onPress={() => router.push('/notifications')} />`
- `90: <Quick icon="pharmacy" color="#16A34A" label={t('pharmacy')} onPress={() => router.push('/(tabs)/pharmacy')} colors={colors} />`
- `109: <Section title={t('appointments')} action={t('viewAll')} onAction={() => router.push('/consultations/appointments')} colors={colors} />`
### auth_ownership
- `2: import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';`
- `27: const [refreshing, setRefreshing] = useState(false);`
- `37: const load = useCallback(async (refresh = false) => {`
- `38: if (refresh) setRefreshing(true); else setLoading(true);`
- `57: setLoading(false); setRefreshing(false);`
- `80: <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.pr`
- `85: {hasError ? <Card style={[styles.error, { backgroundColor: colors.warningSurface, borderColor: colors.warning + '50' }]}><AppText variant="caption" color={colors.textPrimary} align="right">{t('error')}</AppText><TouchableOpacity accessibili`
- `116: function Quick({ icon, color, label, onPress, colors }: { icon: any; color: string; label: string; onPress: () => void; colors: any }) { return <TouchableOpacity accessibilityRole="button" onPress={onPress} style={[styles.quick, { backgroun`
### state_transitions
- `1: import React, { useCallback, useMemo, useState } from 'react';`
- `12: type DoseStatus = 'pending' | 'taken' | 'skipped' | 'missed';`
- `13: type Dose = { time_key: string; status: DoseStatus };`
- `26: const [loading, setLoading] = useState(true);`
- `27: const [refreshing, setRefreshing] = useState(false);`
- `28: const [hasError, setHasError] = useState(false);`
- `29: const [profile, setProfile] = useState<any>(null);`
- `30: const [reminders, setReminders] = useState<Reminder[]>([]);`
- `31: const [nutrition, setNutrition] = useState<NutritionSummary | null>(null);`
- `32: const [maternity, setMaternity] = useState<MaternityProfile | null>(null);`
- `33: const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);`
- `34: const [vitals, setVitals] = useState<any[]>([]);`
### payment_insurance_relevance
- `7: import { AppText, Badge, Card, IconButton } from '../../src/components/ui';`
- `64: return { total: rows.length, taken: rows.filter((item) => item.status === 'taken').length, next: rows.filter((item) => item.status === 'pending').sort((a, b) => a.time_key.localeCompare(b.time_key))[0], activeCount: active.length };`
- `85: {hasError ? <Card style={[styles.error, { backgroundColor: colors.warningSurface, borderColor: colors.warning + '50' }]}><AppText variant="caption" color={colors.textPrimary} align="right">{t('error')}</AppText><TouchableOpacity accessibili`
- `98: <Card onPress={() => router.push('/health/medication-reminder-list')} style={[styles.featureCard, { borderColor: colors.success + '33' }]}>`
- `100: <View style={styles.rightText}>{doseSummary.next ? <><AppText variant="caption" color={colors.textTertiary}>{t('nextDose')} · {doseSummary.next.time_key}</AppText><AppText variant="h6">{doseSummary.next.reminder.medicine_name_ar || doseSumm`
- `107: <Card onPress={() => router.push('/maternity/hub')} style={styles.featureCard}><View style={[styles.featureIcon, { backgroundColor: colors.maternity + '18' }]}><Icon name="pregnant_woman" size={24} color={colors.maternity} /></View><View st`
- `110: <Card onPress={() => appointment?.id ? router.push({ pathname: '/consultations/appointment-detail', params: { id: appointment.id } }) : router.push('/(tabs)/consultations')} style={styles.featureCard}><View style={[styles.featureIcon, { bac`
- `117: function Metric({ icon, color, title, value, onPress, colors }: { icon: any; color: string; title: string; value: string; onPress: () => void; colors: any }) { return <Card onPress={onPress} style={[styles.metric, { borderColor: color + '26`
- `119: const styles = StyleSheet.create({ container: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingH`
### error_empty_loading_retry_cancel
- `12: type DoseStatus = 'pending' | 'taken' | 'skipped' | 'missed';`
- `26: const [loading, setLoading] = useState(true);`
- `28: const [hasError, setHasError] = useState(false);`
- `38: if (refresh) setRefreshing(true); else setLoading(true);`
- `39: setHasError(false);`
- `56: setHasError(failures > 0);`
- `57: setLoading(false); setRefreshing(false);`
- `63: const rows = active.flatMap((reminder) => (reminder.today_doses?.length ? reminder.today_doses : (reminder.times || []).map((time_key) => ({ time_key, status: 'pending' as DoseStatus }))).map((dose) => ({ reminder, ...dose })));`
- `64: return { total: rows.length, taken: rows.filter((item) => item.status === 'taken').length, next: rows.filter((item) => item.status === 'pending').sort((a, b) => a.time_key.localeCompare(b.time_key))[0], activeCount: active.length };`
- `72: if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>{t('loading')}</AppText></View>;`
- `85: {hasError ? <Card style={[styles.error, { backgroundColor: colors.warningSurface, borderColor: colors.warning + '50' }]}><AppText variant="caption" color={colors.textPrimary} align="right">{t('error')}</AppText><TouchableOpacity accessibili`
- `119: const styles = StyleSheet.create({ container: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingH`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
