import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { medicationT } from '../../src/i18n/medications';
import { cancelMedicationNotifications, cancelMedicationSnoozes, getMedicationNotificationPreferences, medicationDisplayName, scheduleMedicationNotifications } from '../../src/utils/medication-notifications';

type DoseStatus = 'pending' | 'taken' | 'skipped' | 'missed';
type Dose = { time_key: string; status: DoseStatus; logged_at?: string | null };
type Reminder = { id: string; medicine_name_ar?: string; medicine_name_en?: string; dose: string; instructions_ar?: string | null; chronic?: boolean; active?: boolean; times?: string[]; today_doses?: Dose[] };
const reminderName = (item: Reminder, fallback: string) => item.medicine_name_ar || item.medicine_name_en || fallback;

export default function MedicationReminderListScreen() {
  const { alertStatus } = useLocalSearchParams<{ alertStatus?: string }>();
  const insets = useSafeAreaInsets();
  const { colors, isDark, lang } = useApp();
  const t = (key: any, vars?: any) => medicationT(lang, key, vars);
  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionKey, setActionKey] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try { const response: any = await apiFetch('/health/reminders'); const rows = Array.isArray(response) ? response : response?.data; setReminders(Array.isArray(rows) ? rows : []); }
    catch { setError(t('logError')); }
    finally { setLoading(false); }
  }, [lang]);
  React.useEffect(() => { load(); }, [load]);

  const logDose = async (reminder: Reminder, dose: Dose, status: 'taken' | 'skipped') => {
    setActionKey(`${reminder.id}-${dose.time_key}-${status}`); setError(null);
    try { await apiFetch(`/health/reminders/${reminder.id}/log`, { method: 'POST', body: JSON.stringify({ status, time_key: dose.time_key, occurred_at: new Date().toISOString() }) }); if (status === 'taken') await cancelMedicationSnoozes(reminder.id, dose.time_key); await load(); }
    catch { setError(t('logError')); }
    finally { setActionKey(null); }
  };
  const stopReminder = async (id: string) => {
    setActionKey(`stop-${id}`); setError(null);
    try { await apiFetch(`/health/reminders/${id}`, { method: 'PATCH', body: JSON.stringify({ active: false }) }); await cancelMedicationNotifications(id); await load(); }
    catch { setError(t('stopError')); }
    finally { setActionKey(null); }
  };
  const syncAlerts = async (reminder: Reminder) => {
    setActionKey(`sync-${reminder.id}`); setError(null);
    try {
      const preferences = await getMedicationNotificationPreferences(reminder.id);
      const result = await scheduleMedicationNotifications(reminder, { title: t('notificationTitle'), body: t('notificationBody', { name: medicationDisplayName(reminder, t('medicineUnnamed')), dose: reminder.dose }), taken: t('takeFromAlert'), snooze: t('snoozeTenMinutes'), permissionDenied: t('alertPermissionDenied') }, preferences);
      if (result.permissionDenied) setError(t('alertPermissionDenied'));
    } catch { setError(t('alertSyncError')); }
    finally { setActionKey(null); }
  };

  const allDoses = reminders.flatMap((reminder) => (reminder.today_doses?.length ? reminder.today_doses : (reminder.times || []).map((time_key) => ({ time_key, status: 'pending' as DoseStatus }))).map((dose) => ({ ...dose, reminder })));
  const scheduled = allDoses.length;
  const taken = allDoses.filter((dose) => dose.status === 'taken').length;
  const next = allDoses.filter((dose) => dose.status === 'pending').sort((a, b) => a.time_key.localeCompare(b.time_key))[0];

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}><Button label={t('add')} variant="ghost" size="sm" icon="add" full={false} onPress={() => router.push('/health/medication-reminder-add')} /><View style={styles.titleWrap}><AppText variant="h3">{t('reminderTitle')}</AppText><AppText variant="caption" color={colors.textTertiary}>{t('doseTimeline')}</AppText></View><IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} /></View>
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>{t('loading')}</AppText></View> : <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(320)}><Card style={[styles.summary, { backgroundColor: colors.primarySurface, borderColor: colors.primary + '2B' }]}>{next ? <><View style={styles.summaryRow}><View style={[styles.timeToken, { backgroundColor: colors.primary }]}><AppText variant="labelMD" color="#fff">{next.time_key}</AppText></View><View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}><AppText variant="caption" color={colors.textTertiary}>{t('nextDose')}</AppText><AppText variant="h6">{reminderName(next.reminder, t('medicineUnnamed'))}</AppText><AppText variant="caption" color={colors.textTertiary}>{t('doseOf', { name: next.reminder.dose, dose: next.reminder.instructions_ar || '' })}</AppText></View></View><Badge label={t('due')} color={colors.primary} /></> : <View style={styles.summaryRow}><View style={[styles.timeToken, { backgroundColor: colors.success }]}><AppText variant="h4" color="#fff">✓</AppText></View><View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}><AppText variant="h6">{t('allCaughtUp')}</AppText><AppText variant="caption" color={colors.textTertiary}>{t('doseProgress', { taken, scheduled })}</AppText></View></View>}</Card></Animated.View>
      {alertStatus === 'permission_denied' && <Card style={[styles.notice, { backgroundColor: colors.warning + '18', borderColor: colors.warning + '45' }]}><AppText variant="bodySM" color={colors.textPrimary} align="right">{t('alertPermissionDenied')}</AppText></Card>}
      {alertStatus === 'synced' && <Card style={[styles.notice, { backgroundColor: colors.success + '18', borderColor: colors.success + '45' }]}><AppText variant="bodySM" color={colors.textPrimary} align="right">{t('alertSynced')}</AppText></Card>}
      {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={load} /></Card>}
      {!error && reminders.length === 0 && <Card style={styles.empty}><AppText variant="h6">{t('noReminders')}</AppText><AppText variant="bodySM" color={colors.textTertiary} align="right">{t('noRemindersHint')}</AppText><Button label={t('addReminder')} variant="gradient" icon="add" onPress={() => router.push('/health/medication-reminder-add')} /></Card>}
      {reminders.map((reminder, index) => <Animated.View key={reminder.id} entering={FadeInDown.delay(90 + index * 55).duration(350)} exiting={FadeOut.duration(160)}><ReminderCard reminder={reminder} colors={colors} t={t} actionKey={actionKey} onLog={logDose} onStop={stopReminder} onSync={syncAlerts} /></Animated.View>)}
    </ScrollView>}
  </View>;
}

function ReminderCard({ reminder, colors, t, actionKey, onLog, onStop, onSync }: { reminder: Reminder; colors: any; t: any; actionKey: string | null; onLog: (r: Reminder, d: Dose, s: 'taken' | 'skipped') => void; onStop: (id: string) => void; onSync: (r: Reminder) => void }) {
  const doses = reminder.today_doses?.length ? reminder.today_doses : (reminder.times || []).map((time_key) => ({ time_key, status: 'pending' as DoseStatus }));
  const colorFor = (status: DoseStatus) => status === 'taken' ? colors.success : status === 'pending' ? colors.primary : status === 'missed' ? colors.warning : colors.textTertiary;
  return <Card style={styles.reminder}><View style={styles.reminderHeading}><View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}><AppText variant="h6">{reminderName(reminder, t('medicineUnnamed'))}</AppText><AppText variant="bodyXS" color={colors.textTertiary}>{t('doseOf', { name: reminder.dose, dose: reminder.instructions_ar || '' })}</AppText></View>{reminder.chronic && <Badge label={t('chronicMedication')} color={colors.warning} />}</View>{doses.map((dose) => <View key={dose.time_key} style={[styles.dose, { borderTopColor: colors.borderLight }]}><View style={[styles.dot, { backgroundColor: colorFor(dose.status) }]} /><View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}><AppText variant="labelMD">{t('doseTime', { time: dose.time_key })}</AppText><AppText variant="caption" color={colorFor(dose.status)}>{t(dose.status)}</AppText></View>{dose.status === 'pending' ? <View style={styles.actions}><Button label={t('takeDose')} variant="primary" size="sm" full={false} loading={actionKey === `${reminder.id}-${dose.time_key}-taken`} onPress={() => onLog(reminder, dose, 'taken')} /><Button label={t('skipDose')} variant="outline" size="sm" full={false} loading={actionKey === `${reminder.id}-${dose.time_key}-skipped`} onPress={() => onLog(reminder, dose, 'skipped')} /></View> : <Badge label={t(dose.status)} color={colorFor(dose.status)} />}</View>)}<View style={styles.footer}><Button label={t('edit')} variant="ghost" size="sm" full={false} onPress={() => router.push({ pathname: '/health/medication-reminder-add', params: { id: reminder.id } })} /><Button label={t('syncAlerts')} variant="ghost" size="sm" full={false} loading={actionKey === `sync-${reminder.id}`} onPress={() => onSync(reminder)} /><Button label={t('stopReminder')} variant="ghost" size="sm" full={false} loading={actionKey === `stop-${reminder.id}`} onPress={() => onStop(reminder.id)} /></View></Card>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }, titleWrap: { alignItems: 'center', gap: 1 }, content: { padding: 16, gap: 14 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, summary: { gap: 12, borderWidth: 1 }, summaryRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }, timeToken: { minWidth: 62, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 }, error: { backgroundColor: '#FEE2E2', alignItems: 'flex-end', gap: 8 }, notice: { borderWidth: 1, alignItems: 'flex-end' }, empty: { gap: 12, alignItems: 'flex-end', padding: 20 }, reminder: { gap: 9 }, reminderHeading: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }, dose: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9, paddingTop: 10, borderTopWidth: 1 }, dot: { width: 9, height: 9, borderRadius: 5 }, actions: { flexDirection: 'row-reverse', gap: 6 }, footer: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 2 } });
