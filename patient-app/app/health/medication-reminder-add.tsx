import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { AppText, Card, Button, IconButton, Input, SegmentedControl } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { getMedicationNotificationPreferences, medicationDisplayName, scheduleMedicationNotifications, setMedicationNotificationPreferences } from '../../src/utils/medication-notifications';
import { medicationT } from '../../src/i18n/medications';

const TIME_OPTIONS = ['06:00', '08:00', '12:00', '14:00', '18:00', '20:00', '22:00'];
const currentZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };
type ExistingReminder = { id: string; medicine_name_ar?: string; medicine_name_en?: string; dose?: string; dosage_count?: number; times?: string[]; frequency?: string; duration_days?: number; chronic?: boolean; instructions_ar?: string; pills_remaining?: number; refill_date?: string | null; time_zone?: string; active?: boolean };

export default function MedicationReminderAddScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = typeof id === 'string' && id.length > 0;
  const insets = useSafeAreaInsets();
  const { colors, isDark, lang } = useApp();
  const t = (key: any, vars?: any) => medicationT(lang, key, vars);
  const [name, setName] = React.useState(''); const [dose, setDose] = React.useState(''); const [count, setCount] = React.useState('1'); const [times, setTimes] = React.useState<string[]>(['08:00']);
  const [frequency, setFrequency] = React.useState('daily'); const [duration, setDuration] = React.useState('30'); const [chronic, setChronic] = React.useState(false); const [pillsRemaining, setPillsRemaining] = React.useState(''); const [refillDate, setRefillDate] = React.useState(''); const [instructions, setInstructions] = React.useState(''); const [timeZone, setTimeZone] = React.useState(currentZone());
  const [important, setImportant] = React.useState(false); const [refillLeadDays, setRefillLeadDays] = React.useState<2 | 3>(3);
  const [loading, setLoading] = React.useState(editing); const [saving, setSaving] = React.useState(false); const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!editing) return;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const response: any = await apiFetch('/health/reminders');
        const rows: ExistingReminder[] = Array.isArray(response) ? response : response?.data || [];
        const item = rows.find((row) => row.id === id);
        if (!item) throw new Error('not_found');
        setName(item.medicine_name_ar || item.medicine_name_en || ''); setDose(item.dose || ''); setCount(String(item.dosage_count ?? 1)); setTimes(item.times?.length ? item.times : ['08:00']); setFrequency(item.frequency || 'daily'); setDuration(String(item.duration_days ?? 30)); setChronic(Boolean(item.chronic)); setInstructions(item.instructions_ar || ''); setPillsRemaining(item.pills_remaining == null ? '' : String(item.pills_remaining)); setRefillDate(item.refill_date ? String(item.refill_date).slice(0, 10) : ''); setTimeZone(item.time_zone || currentZone());
        const preferences = await getMedicationNotificationPreferences(item.id);
        setImportant(Boolean(preferences.important)); setRefillLeadDays(preferences.refill_lead_days === 2 ? 2 : 3);
      } catch { setError(t('saveError')); } finally { setLoading(false); }
    };
    load();
  }, [editing, id, lang]);

  const toggleTime = (time: string) => setTimes((current) => current.includes(time) ? current.filter((item) => item !== time) : [...current, time].sort());
  const save = async () => {
    const dosage_count = Number(count); const duration_days = chronic ? 0 : Number(duration); const pills_remaining = pillsRemaining.trim() ? Number(pillsRemaining) : undefined;
    if (!name.trim() || !dose.trim() || !times.length) { setError(t('formRequired')); return; }
    if (!Number.isFinite(dosage_count) || dosage_count <= 0 || !Number.isInteger(duration_days) || duration_days < 0 || (pills_remaining !== undefined && (!Number.isInteger(pills_remaining) || pills_remaining < 0))) { setError(t('formInvalid')); return; }
    setSaving(true); setError(null);
    try {
      const payload = { medicine_name_ar: name.trim(), dose: dose.trim(), dosage_count, times, time_zone: timeZone.trim(), frequency, duration_days, chronic, pills_remaining, refill_date: refillDate.trim() || undefined, instructions_ar: instructions.trim() || undefined };
      const response: any = await apiFetch(editing ? `/health/reminders/${id}` : '/health/reminders', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      const saved: ExistingReminder = response?.data || response;
      const reminderId = saved?.id || (editing ? id : undefined);
      if (!reminderId) throw new Error('missing_reminder_id');
      const preferences = await setMedicationNotificationPreferences(reminderId, { important, refill_lead_days: refillLeadDays });
      const notificationResult = await scheduleMedicationNotifications({ id: reminderId, medicine_name_ar: saved.medicine_name_ar || name.trim(), medicine_name_en: saved.medicine_name_en, dose: saved.dose || dose.trim(), times: saved.times || times, frequency: saved.frequency || frequency, active: saved.active !== false }, {
        title: t('notificationTitle'), body: t('notificationBody', { name: medicationDisplayName(saved, name.trim()), dose: saved.dose || dose.trim() }), taken: t('takeFromAlert'), snooze: t('snoozeTenMinutes'), permissionDenied: t('alertPermissionDenied'),
      }, preferences);
      router.replace({ pathname: '/health/medication-reminder-list', params: notificationResult.permissionDenied ? { alertStatus: 'permission_denied' } : { alertStatus: 'synced' } });
    } catch { setError(t('saveError')); } finally { setSaving(false); }
  };

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><View style={styles.titleWrap}><AppText variant="h3">{editing ? t('editTitle') : t('addTitle')}</AppText><AppText variant="caption" color={colors.textTertiary}>{t('safeReminder')}</AppText></View><IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} /></View>
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>{t('loading')}</AppText></View> : <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
      {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText></Card>}
      <Animated.View entering={FadeInDown.duration(300)}><Card style={styles.section}><SectionTitle index="1" title={t('medicationAndDose')} colors={colors} /><Input value={name} onChangeText={setName} placeholder={t('medicationName')} /><Input value={dose} onChangeText={setDose} placeholder={t('dosePlaceholder')} /><Input value={count} onChangeText={setCount} placeholder={t('unitsPerDose')} keyboardType="numeric" /><AppText variant="caption" color={colors.textTertiary} align="right">{t('doseSafety')}</AppText></Card></Animated.View>
      <Animated.View entering={FadeInDown.delay(70).duration(300)}><Card style={styles.section}><SectionTitle index="2" title={t('schedule')} colors={colors} /><View style={styles.times}>{TIME_OPTIONS.map((time) => { const selected = times.includes(time); return <TouchableOpacity key={time} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => toggleTime(time)} style={[styles.time, { backgroundColor: selected ? colors.primary : colors.surfaceSecondary, borderColor: selected ? colors.primary : colors.border }]}><AppText variant="labelSM" color={selected ? '#fff' : colors.textPrimary}>{time}</AppText></TouchableOpacity>; })}</View><AppText variant="caption" color={colors.textTertiary} align="right">{t('timeZone')}</AppText><Input value={timeZone} onChangeText={setTimeZone} placeholder="Asia/Riyadh" /><AppText variant="caption" color={colors.textTertiary} align="right">{t('timeZoneHint')}</AppText></Card></Animated.View>
      <Animated.View entering={FadeInDown.delay(140).duration(300)}><Card style={styles.section}><SectionTitle index="3" title={t('frequencyAndDuration')} colors={colors} /><SegmentedControl value={frequency} onChange={setFrequency} options={[{ key: 'daily', label: t('daily') }, { key: 'weekly', label: t('weekly') }, { key: 'as_needed', label: t('asNeeded') }]} /><SegmentedControl value={chronic ? 'chronic' : 'limited'} onChange={(value) => setChronic(value === 'chronic')} options={[{ key: 'limited', label: t('limitedDuration') }, { key: 'chronic', label: t('chronicMedication') }]} />{!chronic && <Input value={duration} onChangeText={setDuration} placeholder={t('durationDays')} keyboardType="numeric" />}</Card></Animated.View>
      <Animated.View entering={FadeInDown.delay(180).duration(300)}><Card style={[styles.section, { borderColor: important ? colors.warning + '70' : colors.border }]}><SectionTitle index="4" title={t('deviceAlerts')} colors={colors} /><SegmentedControl value={important ? 'important' : 'normal'} onChange={(value) => setImportant(value === 'important')} options={[{ key: 'normal', label: t('normalAlert') }, { key: 'important', label: t('importantAlert') }]} /><AppText variant="caption" color={colors.textTertiary} align="right">{t('importantMedicationHint')}</AppText></Card></Animated.View>
      {chronic && <Animated.View entering={FadeInDown.duration(260)}><Card style={[styles.section, { borderColor: colors.warning + '55' }]}><SectionTitle index="5" title={t('refillTracking')} colors={colors} /><Input value={pillsRemaining} onChangeText={setPillsRemaining} placeholder={t('remainingUnits')} keyboardType="numeric" /><Input value={refillDate} onChangeText={setRefillDate} placeholder={t('refillDate')} /><SegmentedControl value={String(refillLeadDays)} onChange={(value) => setRefillLeadDays(value === '2' ? 2 : 3)} options={[{ key: '2', label: t('twoDays') }, { key: '3', label: t('threeDays') }]} /><AppText variant="caption" color={colors.textTertiary} align="right">{t('refillHint')}</AppText></Card></Animated.View>}
      <Animated.View entering={FadeInDown.delay(230).duration(300)}><Card style={styles.section}><AppText variant="h6" align="right">{t('instructions')}</AppText><Input value={instructions} onChangeText={setInstructions} placeholder={t('instructionsHint')} multiline /></Card></Animated.View>
      <Animated.View entering={FadeInDown.delay(300).duration(300)}><Button label={editing ? t('saveChanges') : t('saveReminder')} variant="gradient" icon="check_circle" loading={saving} onPress={save} /></Animated.View>
    </ScrollView>}
  </View>;
}

function SectionTitle({ index, title, colors }: { index: string; title: string; colors: any }) { return <View style={styles.sectionTitle}><View style={[styles.step, { backgroundColor: colors.primary }]}><AppText variant="labelSM" color="#fff">{index}</AppText></View><AppText variant="h6">{title}</AppText></View>; }
const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }, titleWrap: { flex: 1, alignItems: 'center', gap: 1, paddingHorizontal: 6 }, content: { padding: 16, gap: 14 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, section: { gap: 12, borderWidth: 1, borderColor: 'transparent' }, sectionTitle: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }, step: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, error: { backgroundColor: '#FEE2E2', alignItems: 'flex-end' }, times: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }, time: { minWidth: 70, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 } });
