import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

type DoseStatus = 'pending' | 'taken' | 'skipped' | 'missed';
type Dose = { time_key: string; status: DoseStatus; logged_at?: string | null };
type Reminder = {
  id: string; medicine_name_ar?: string; medicine_name_en?: string; dose: string; instructions_ar?: string | null;
  chronic?: boolean; active?: boolean; times?: string[]; today_doses?: Dose[]; time_zone?: string; pills_remaining?: number; refill_date?: string | null;
};

const nameOf = (item: Reminder) => item.medicine_name_ar || item.medicine_name_en || 'دواء غير مسمى';
const statusLabel: Record<DoseStatus, string> = { pending: 'بانتظار التسجيل', taken: 'تم أخذها', skipped: 'تم التخطي', missed: 'فات موعدها' };

export default function MedicationReminderListScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionKey, setActionKey] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response: any = await apiFetch('/health/reminders');
      const rows = Array.isArray(response) ? response : response?.data;
      setReminders(Array.isArray(rows) ? rows : []);
    } catch {
      setError('تعذر تحميل تذكيرات الدواء. تحقق من الاتصال ثم أعد المحاولة.');
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const logDose = async (reminder: Reminder, dose: Dose, status: 'taken' | 'skipped') => {
    setActionKey(`${reminder.id}-${dose.time_key}-${status}`); setError(null);
    try {
      await apiFetch(`/health/reminders/${reminder.id}/log`, { method: 'POST', body: JSON.stringify({ status, time_key: dose.time_key }) });
      await load();
    } catch {
      setError('تعذر تسجيل نتيجة الجرعة. لم يتم تغيير حالتها.');
    } finally { setActionKey(null); }
  };

  const stopReminder = async (id: string) => {
    setActionKey(`stop-${id}`); setError(null);
    try { await apiFetch(`/health/reminders/${id}`, { method: 'PATCH', body: JSON.stringify({ active: false }) }); await load(); }
    catch { setError('تعذر إيقاف التذكير.'); }
    finally { setActionKey(null); }
  };

  const scheduled = reminders.reduce((count, item) => count + (item.today_doses?.length || item.times?.length || 0), 0);
  const taken = reminders.reduce((count, item) => count + (item.today_doses || []).filter((dose) => dose.status === 'taken').length, 0);

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}><Button label="إضافة" variant="ghost" size="sm" icon="add" full={false} onPress={() => router.push('/health/medication-reminder-add')} /><AppText variant="h3">تذكيرات الدواء</AppText><IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} /></View>
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>جارٍ تحميل تذكيراتك…</AppText></View> :
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <Card style={[styles.summary, { backgroundColor: colors.primarySurface }]}><AppText variant="h4" color={colors.primary}>{taken} / {scheduled || 0}</AppText><AppText variant="bodySM" color={colors.textSecondary}>جرعات اليوم التي سُجلت كـ «تم أخذها»</AppText><AppText variant="caption" color={colors.textTertiary}>تُحفظ النتيجة مرة واحدة لكل موعد؛ لا نغيّر الجرعة أو الوصفة تلقائياً.</AppText></Card>
        {error && <Card style={styles.errorCard}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={load} /></Card>}
        {!error && reminders.length === 0 && <Card style={styles.empty}><AppText variant="h6">لا توجد تذكيرات نشطة</AppText><AppText variant="bodySM" color={colors.textTertiary} align="right">أضف تذكيراً لدوائك إذا أردت متابعة المواعيد. لا تضف أو تعدّل الجرعة دون الرجوع إلى وصفك أو مقدم الرعاية.</AppText><Button label="إضافة تذكير" variant="gradient" icon="add" onPress={() => router.push('/health/medication-reminder-add')} /></Card>}
        {reminders.map((reminder) => <ReminderCard key={reminder.id} reminder={reminder} colors={colors} actionKey={actionKey} onLog={logDose} onStop={stopReminder} />)}
      </ScrollView>}
  </View>;
}

function ReminderCard({ reminder, colors, actionKey, onLog, onStop }: { reminder: Reminder; colors: any; actionKey: string | null; onLog: (r: Reminder, d: Dose, s: 'taken' | 'skipped') => void; onStop: (id: string) => void }) {
  const doses = reminder.today_doses?.length ? reminder.today_doses : (reminder.times || []).map((time_key) => ({ time_key, status: 'pending' as DoseStatus }));
  return <Card style={styles.reminder}>
    <View style={styles.row}><View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}><AppText variant="h6">{nameOf(reminder)}</AppText><AppText variant="bodyXS" color={colors.textTertiary}>{reminder.dose}{reminder.instructions_ar ? ` · ${reminder.instructions_ar}` : ''}</AppText></View>{reminder.chronic && <Badge label="مزمن" color={colors.warning} />}</View>
    {doses.map((dose) => <View key={dose.time_key} style={[styles.doseRow, { borderTopColor: colors.borderLight }]}><View style={{ flex: 1, alignItems: 'flex-end' }}><AppText variant="labelMD">{dose.time_key}</AppText><AppText variant="caption" color={dose.status === 'taken' ? colors.success : colors.textTertiary}>{statusLabel[dose.status]}</AppText></View>{dose.status === 'pending' ? <View style={styles.actions}><Button label="تم أخذها" variant="primary" size="sm" full={false} loading={actionKey === `${reminder.id}-${dose.time_key}-taken`} onPress={() => onLog(reminder, dose, 'taken')} /><Button label="تخطي" variant="outline" size="sm" full={false} loading={actionKey === `${reminder.id}-${dose.time_key}-skipped`} onPress={() => onLog(reminder, dose, 'skipped')} /></View> : <Badge label={statusLabel[dose.status]} color={dose.status === 'taken' ? colors.success : colors.textTertiary} />}</View>)}
    <View style={styles.footer}><Button label="تعديل" variant="ghost" size="sm" full={false} onPress={() => router.push({ pathname: '/health/medication-reminder-add', params: { id: reminder.id } })} /><Button label="إيقاف التذكير" variant="ghost" size="sm" full={false} loading={actionKey === `stop-${reminder.id}`} onPress={() => onStop(reminder.id)} /></View>
  </Card>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }, content: { padding: 16, gap: 14 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, summary: { alignItems: 'flex-end', gap: 4 }, errorCard: { backgroundColor: '#FEE2E2', alignItems: 'flex-end', gap: 8 }, empty: { gap: 12, alignItems: 'flex-end', padding: 20 }, reminder: { gap: 8 }, row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }, doseRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1 }, actions: { flexDirection: 'row-reverse', gap: 6 }, footer: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 3 } });
