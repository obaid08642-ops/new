# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/health/medication-reminder-list.tsx`
- **Member SHA-256:** `99997b0eae6b6a4e252a5f7deae8097bb33dcbc63ef43832a7047426f52d0481`
- **Line count:** 89
- **Read range:** `1-89`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router, useLocalSearchParams } from 'expo-router';`
- `10: import { cancelMedicationNotifications, cancelMedicationSnoozes, getMedicationNotificationPreferences, medicationDisplayName, scheduleMedicationNotifications } from '../../src/utils/medication-notifications';`
- `23: export default function MedicationReminderListScreen() {`
- `43: try { await apiFetch(`/health/reminders/${reminder.id}/log`, { method: 'POST', body: JSON.stringify({ status, time_key: dose.time_key, occurred_at: new Date().toISOString() }) }); if (status === 'taken') await cancelMedicationSnoozes(remind`
- `49: try { await apiFetch(`/health/reminders/${id}`, { method: 'PATCH', body: JSON.stringify({ active: false }) }); await cancelMedicationNotifications(id); await load(); }`
- `70: <View style={[styles.header, { paddingTop: insets.top + 16 }]}><Button label={t('add')} variant="ghost" size="sm" icon="add" full={false} onPress={() => router.push('/health/medication-reminder-add')} /><View style={styles.titleWrap}><AppTe`
- `75: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `76: {!error && reminders.length === 0 && <Card style={styles.empty}><AppText variant="h6">{t('noReminders')}</AppText><AppText variant="bodySM" color={colors.textTertiary} align="right">{t('noRemindersHint')}</AppText><Button label={t('addRemin`
- `86: return <Card style={styles.reminder}><View style={styles.reminderHeading}><View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}><AppText variant="h6">{reminderName(reminder, t('medicineUnnamed'))}</AppText><AppText variant="bodyXS" colo`
### backend_consumers_or_contracts
- `35: try { const response: any = await apiFetch('/health/reminders'); const rows = Array.isArray(response) ? response : response?.data; setReminders(Array.isArray(rows) ? rows : []); }`
- `43: try { await apiFetch(`/health/reminders/${reminder.id}/log`, { method: 'POST', body: JSON.stringify({ status, time_key: dose.time_key, occurred_at: new Date().toISOString() }) }); if (status === 'taken') await cancelMedicationSnoozes(remind`
- `49: try { await apiFetch(`/health/reminders/${id}`, { method: 'PATCH', body: JSON.stringify({ active: false }) }); await cancelMedicationNotifications(id); await load(); }`
### auth_ownership
- `57: const result = await scheduleMedicationNotifications(reminder, { title: t('notificationTitle'), body: t('notificationBody', { name: medicationDisplayName(reminder, t('medicineUnnamed')), dose: reminder.dose }), taken: t('takeFromAlert'), sn`
- `58: if (result.permissionDenied) setError(t('alertPermissionDenied'));`
- `72: <Animated.View entering={FadeInDown.duration(320)}><Card style={[styles.summary, { backgroundColor: colors.primarySurface, borderColor: colors.primary + '2B' }]}>{next ? <><View style={styles.summaryRow}><View style={[styles.timeToken, { ba`
- `73: {alertStatus === 'permission_denied' && <Card style={[styles.notice, { backgroundColor: colors.warning + '18', borderColor: colors.warning + '45' }]}><AppText variant="bodySM" color={colors.textPrimary} align="right">{t('alertPermissionDeni`
- `89: const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }, titleWrap: { alignItems: 'center', gap: 1 }`
### state_transitions
- `2: import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';`
- `10: import { cancelMedicationNotifications, cancelMedicationSnoozes, getMedicationNotificationPreferences, medicationDisplayName, scheduleMedicationNotifications } from '../../src/utils/medication-notifications';`
- `12: type DoseStatus = 'pending' | 'taken' | 'skipped' | 'missed';`
- `13: type Dose = { time_key: string; status: DoseStatus; logged_at?: string | null };`
- `24: const { alertStatus } = useLocalSearchParams<{ alertStatus?: string }>();`
- `28: const [reminders, setReminders] = React.useState<Reminder[]>([]);`
- `29: const [loading, setLoading] = React.useState(true);`
- `30: const [error, setError] = React.useState<string | null>(null);`
- `31: const [actionKey, setActionKey] = React.useState<string | null>(null);`
- `34: setLoading(true); setError(null);`
- `36: catch { setError(t('logError')); }`
- `37: finally { setLoading(false); }`
### payment_insurance_relevance
- `7: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `72: <Animated.View entering={FadeInDown.duration(320)}><Card style={[styles.summary, { backgroundColor: colors.primarySurface, borderColor: colors.primary + '2B' }]}>{next ? <><View style={styles.summaryRow}><View style={[styles.timeToken, { ba`
- `73: {alertStatus === 'permission_denied' && <Card style={[styles.notice, { backgroundColor: colors.warning + '18', borderColor: colors.warning + '45' }]}><AppText variant="bodySM" color={colors.textPrimary} align="right">{t('alertPermissionDeni`
- `74: {alertStatus === 'synced' && <Card style={[styles.notice, { backgroundColor: colors.success + '18', borderColor: colors.success + '45' }]}><AppText variant="bodySM" color={colors.textPrimary} align="right">{t('alertSynced')}</AppText></Card`
- `75: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `76: {!error && reminders.length === 0 && <Card style={styles.empty}><AppText variant="h6">{t('noReminders')}</AppText><AppText variant="bodySM" color={colors.textTertiary} align="right">{t('noRemindersHint')}</AppText><Button label={t('addRemin`
- `77: {reminders.map((reminder, index) => <Animated.View key={reminder.id} entering={FadeInDown.delay(90 + index * 55).duration(350)} exiting={FadeOut.duration(160)}><ReminderCard reminder={reminder} colors={colors} t={t} actionKey={actionKey} on`
- `82: function ReminderCard({ reminder, colors, t, actionKey, onLog, onStop, onSync }: { reminder: Reminder; colors: any; t: any; actionKey: string | null; onLog: (r: Reminder, d: Dose, s: 'taken' | 'skipped') => void; onStop: (id: string) => voi`
- `86: return <Card style={styles.reminder}><View style={styles.reminderHeading}><View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}><AppText variant="h6">{reminderName(reminder, t('medicineUnnamed'))}</AppText><AppText variant="bodyXS" colo`
### error_empty_loading_retry_cancel
- `10: import { cancelMedicationNotifications, cancelMedicationSnoozes, getMedicationNotificationPreferences, medicationDisplayName, scheduleMedicationNotifications } from '../../src/utils/medication-notifications';`
- `12: type DoseStatus = 'pending' | 'taken' | 'skipped' | 'missed';`
- `29: const [loading, setLoading] = React.useState(true);`
- `30: const [error, setError] = React.useState<string | null>(null);`
- `34: setLoading(true); setError(null);`
- `36: catch { setError(t('logError')); }`
- `37: finally { setLoading(false); }`
- `42: setActionKey(`${reminder.id}-${dose.time_key}-${status}`); setError(null);`
- `43: try { await apiFetch(`/health/reminders/${reminder.id}/log`, { method: 'POST', body: JSON.stringify({ status, time_key: dose.time_key, occurred_at: new Date().toISOString() }) }); if (status === 'taken') await cancelMedicationSnoozes(remind`
- `44: catch { setError(t('logError')); }`
- `48: setActionKey(`stop-${id}`); setError(null);`
- `49: try { await apiFetch(`/health/reminders/${id}`, { method: 'PATCH', body: JSON.stringify({ active: false }) }); await cancelMedicationNotifications(id); await load(); }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
