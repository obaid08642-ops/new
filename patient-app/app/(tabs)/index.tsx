import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useApp } from '../../src/context/AppContext';
import { AppText, Badge, Card, IconButton } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { apiFetch } from '../../src/utils/api';
import { healthDayT } from '../../src/i18n/health-day';

type DoseStatus = 'pending' | 'taken' | 'skipped' | 'missed';
type Dose = { time_key: string; status: DoseStatus };
type Reminder = { id: string; medicine_name_ar?: string; medicine_name_en?: string; dose?: string; active?: boolean; times?: string[]; today_doses?: Dose[] };
type NutritionSummary = { meals_count?: number; water?: { consumed_ml?: number; target_ml?: number | null } };
type MaternityProfile = { profile_ready?: boolean; tracking_mode?: 'pregnancy' | 'cycle' | null; is_pregnant?: boolean };
type MoodEntry = { logged_at?: string; createdAt?: string };
type Appointment = { id?: string; doctorName?: string | null; type?: string; time?: string; date?: string };
const unwrap = <T,>(value: any): T => value?.data ?? value;
const localDate = (value?: string) => value ? new Date(value).toDateString() : '';

export default function HealthDayScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, lang } = useApp();
  const t = (key: Parameters<typeof healthDayT>[1], vars?: Record<string, string | number>) => healthDayT(lang, key, vars);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [nutrition, setNutrition] = useState<NutritionSummary | null>(null);
  const [maternity, setMaternity] = useState<MaternityProfile | null>(null);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [vitals, setVitals] = useState<any[]>([]);
  const [appointment, setAppointment] = useState<Appointment | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setHasError(false);
    const results = await Promise.allSettled([
      apiFetch('/users/me/profile'), apiFetch('/health/reminders'), apiFetch('/nutrition/daily-summary'),
      apiFetch('/maternity/profile'), apiFetch('/mental-health/mood?days=1'), apiFetch('/health/vitals/summary'), apiFetch('/home/upcoming-appointment'),
    ]);
    const value = (index: number) => results[index].status === 'fulfilled' ? (results[index] as PromiseFulfilledResult<unknown>).value : undefined;
    const failures = results.filter((item) => item.status === 'rejected').length;
    const reminderRows = unwrap<any[]>(value(1));
    const moodRows = unwrap<any[]>(value(4));
    const vitalRows = unwrap<any[]>(value(5));
    setProfile(unwrap(value(0)) || null);
    setReminders(Array.isArray(reminderRows) ? reminderRows : []);
    setNutrition(unwrap<NutritionSummary>(value(2)) || null);
    setMaternity(unwrap<MaternityProfile>(value(3)) || null);
    setMoodEntries(Array.isArray(moodRows) ? moodRows : []);
    setVitals(Array.isArray(vitalRows) ? vitalRows : []);
    setAppointment(unwrap<Appointment>(value(6)) || null);
    setHasError(failures > 0);
    setLoading(false); setRefreshing(false);
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const doseSummary = useMemo(() => {
    const active = reminders.filter((item) => item.active !== false);
    const rows = active.flatMap((reminder) => (reminder.today_doses?.length ? reminder.today_doses : (reminder.times || []).map((time_key) => ({ time_key, status: 'pending' as DoseStatus }))).map((dose) => ({ reminder, ...dose })));
    return { total: rows.length, taken: rows.filter((item) => item.status === 'taken').length, next: rows.filter((item) => item.status === 'pending').sort((a, b) => a.time_key.localeCompare(b.time_key))[0], activeCount: active.length };
  }, [reminders]);
  const moodLoggedToday = moodEntries.some((entry) => localDate(entry.logged_at || entry.createdAt) === new Date().toDateString());
  const patientName = typeof profile?.name === 'string' && profile.name.trim() ? profile.name.trim() : null;
  const water = nutrition?.water?.consumed_ml ?? 0;
  const mealCount = nutrition?.meals_count ?? 0;
  const maternityTitle = maternity?.profile_ready ? (maternity.is_pregnant ? t('maternityPregnancy') : t('maternityCycle')) : t('maternityNotSet');

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>{t('loading')}</AppText></View>;

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.primary }]}>
      <IconButton icon="notification" bg="rgba(255,255,255,0.15)" color="#FFFFFF" onPress={() => router.push('/notifications')} />
      <View style={styles.headerTitle}><AppText variant="h3" color="#FFFFFF">{t('title')}</AppText><AppText variant="caption" color="rgba(255,255,255,0.82)">{t('subtitle')}</AppText></View>
      <IconButton icon="person" bg="rgba(255,255,255,0.15)" color="#FFFFFF" onPress={() => router.push('/profile')} />
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />}>
      <Animated.View entering={FadeInDown.duration(280)} style={[styles.greeting, { backgroundColor: colors.primarySurface, borderColor: colors.primary + '26' }]}>
        <View style={[styles.greetingIcon, { backgroundColor: colors.primary }]}><Icon name="heart-pulse" size={24} color="#FFFFFF" /></View>
        <View style={styles.rightText}><AppText variant="h5" color={colors.textPrimary}>{patientName ? `${t('greeting')}، ${patientName}` : `${t('greeting')} ${t('anonymous')}`}</AppText><AppText variant="caption" color={colors.textTertiary}>{t('updated')}</AppText></View>
      </Animated.View>
      {hasError ? <Card style={[styles.error, { backgroundColor: colors.warningSurface, borderColor: colors.warning + '50' }]}><AppText variant="caption" color={colors.textPrimary} align="right">{t('error')}</AppText><TouchableOpacity accessibilityRole="button" onPress={() => void load(true)}><AppText variant="labelSM" color={colors.primary}>{t('retry')}</AppText></TouchableOpacity></Card> : null}

      <Section title={t('quickAccess')} colors={colors} />
      <View style={styles.quickGrid}>
        <Quick icon="consultations" color="#2E86FF" label={t('consultation')} onPress={() => router.push('/(tabs)/consultations')} colors={colors} />
        <Quick icon="pharmacy" color="#16A34A" label={t('pharmacy')} onPress={() => router.push('/(tabs)/pharmacy')} colors={colors} />
        <Quick icon="science" color="#7A6BEA" label={t('diagnostics')} onPress={() => router.push('/(tabs)/diagnostics')} colors={colors} />
        <Quick icon="emergency" color="#DC2626" label={t('emergency')} onPress={() => router.push('/emergency/sos')} colors={colors} />
        <Quick icon="heart-pulse" color="#23B5CE" label={t('profile')} onPress={() => router.push('/(tabs)/health')} colors={colors} />
        <Quick icon="brain" color="#7A6BEA" label={t('safeTriage')} onPress={() => router.push('/ai/triage')} colors={colors} />
      </View>

      <Section title={t('medications')} action={t('manageReminders')} onAction={() => router.push('/health/medication-reminder-list')} colors={colors} />
      <Card onPress={() => router.push('/health/medication-reminder-list')} style={[styles.featureCard, { borderColor: colors.success + '33' }]}>
        <View style={[styles.featureIcon, { backgroundColor: colors.success + '18' }]}><Icon name="medication" size={24} color={colors.success} /></View>
        <View style={styles.rightText}>{doseSummary.next ? <><AppText variant="caption" color={colors.textTertiary}>{t('nextDose')} · {doseSummary.next.time_key}</AppText><AppText variant="h6">{doseSummary.next.reminder.medicine_name_ar || doseSummary.next.reminder.medicine_name_en || t('medications')}</AppText><AppText variant="caption" color={colors.textSecondary}>{doseSummary.next.reminder.dose || ''}</AppText></> : <><AppText variant="h6">{doseSummary.activeCount ? t('allCaughtUp') : t('noReminders')}</AppText><AppText variant="caption" color={colors.textTertiary}>{doseSummary.total ? t('medicationProgress', { taken: doseSummary.taken, scheduled: doseSummary.total }) : t('noData')}</AppText></>}</View><Icon name="chevronLeft" size={20} color={colors.textTertiary} /></Card>

      <Section title={t('nutrition')} action={t('openTracker')} onAction={() => router.push('/nutrition/daily-tracker')} colors={colors} />
      <View style={styles.doubleGrid}><Metric icon="food" color={colors.primary} title={t('mealsToday')} value={t('mealsCount', { count: mealCount })} onPress={() => router.push('/nutrition/daily-tracker')} colors={colors} /><Metric icon="water" color={colors.info} title={t('waterToday')} value={t('waterAmount', { count: water })} onPress={() => router.push('/nutrition/daily-tracker')} colors={colors} /></View>

      <Section title={t('healthRecords')} colors={colors} />
      <View style={styles.doubleGrid}><Metric icon="heart-pulse" color={colors.secondary} title={t('vitals')} value={vitals.length ? t('updated') : t('noVitals')} onPress={() => router.push('/health/vitals')} colors={colors} /><Metric icon="brain" color="#7A6BEA" title={t('mood')} value={moodLoggedToday ? t('moodLogged') : t('moodNotLogged')} onPress={() => router.push('/mental-health/mood-journal')} colors={colors} /></View>
      <Card onPress={() => router.push('/maternity/hub')} style={styles.featureCard}><View style={[styles.featureIcon, { backgroundColor: colors.maternity + '18' }]}><Icon name="pregnant_woman" size={24} color={colors.maternity} /></View><View style={styles.rightText}><AppText variant="h6">{t('maternity')}</AppText><AppText variant="caption" color={colors.textTertiary}>{maternityTitle}</AppText></View><Icon name="chevronLeft" size={20} color={colors.textTertiary} /></Card>

      <Section title={t('appointments')} action={t('viewAll')} onAction={() => router.push('/consultations/appointments')} colors={colors} />
      <Card onPress={() => appointment?.id ? router.push({ pathname: '/consultations/appointment-detail', params: { id: appointment.id } }) : router.push('/(tabs)/consultations')} style={styles.featureCard}><View style={[styles.featureIcon, { backgroundColor: '#2E86FF18' }]}><Icon name="calendar_today" size={24} color="#2E86FF" /></View><View style={styles.rightText}>{appointment ? <><AppText variant="caption" color={colors.textTertiary}>{t('nextAppointment')}</AppText><AppText variant="h6">{appointment.doctorName || appointment.type || t('consultation')}</AppText><AppText variant="caption" color={colors.textSecondary}>{[appointment.date, appointment.time].filter(Boolean).join(' · ')}</AppText></> : <><AppText variant="h6">{t('noAppointment')}</AppText><AppText variant="caption" color={colors.textTertiary}>{t('consultation')}</AppText></>}</View><Icon name="chevronLeft" size={20} color={colors.textTertiary} /></Card>
    </ScrollView>
  </View>;
}

function Section({ title, action, onAction, colors }: { title: string; action?: string; onAction?: () => void; colors: any }) { return <View style={styles.sectionHeader}><View style={{ flex: 1 }} />{action && onAction ? <TouchableOpacity onPress={onAction}><AppText variant="labelSM" color={colors.primary}>{action}</AppText></TouchableOpacity> : null}<AppText variant="h5" color={colors.textPrimary} style={{ marginLeft: action ? 12 : 0 }}>{title}</AppText></View>; }
function Quick({ icon, color, label, onPress, colors }: { icon: any; color: string; label: string; onPress: () => void; colors: any }) { return <TouchableOpacity accessibilityRole="button" onPress={onPress} style={[styles.quick, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.quickIcon, { backgroundColor: color + '18' }]}><Icon name={icon} size={22} color={color} /></View><AppText variant="caption" color={colors.textPrimary} align="center" numberOfLines={2}>{label}</AppText></TouchableOpacity>; }
function Metric({ icon, color, title, value, onPress, colors }: { icon: any; color: string; title: string; value: string; onPress: () => void; colors: any }) { return <Card onPress={onPress} style={[styles.metric, { borderColor: color + '26' }]}><View style={[styles.metricIcon, { backgroundColor: color + '18' }]}><Icon name={icon} size={20} color={color} /></View><AppText variant="labelSM" color={colors.textSecondary} align="right">{title}</AppText><AppText variant="caption" color={colors.textPrimary} align="right" numberOfLines={2}>{value}</AppText></Card>; }

const styles = StyleSheet.create({ container: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }, headerTitle: { alignItems: 'center', gap: 2 }, content: { padding: 16, gap: 14 }, greeting: { borderWidth: 1, borderRadius: 20, padding: 16, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }, greetingIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, rightText: { flex: 1, alignItems: 'flex-end', gap: 3 }, error: { borderWidth: 1, gap: 8, alignItems: 'flex-end' }, sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }, quickGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 }, quick: { width: '31.8%', minHeight: 96, padding: 10, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 7 }, quickIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, featureCard: { minHeight: 86, flexDirection: 'row-reverse', alignItems: 'center', gap: 12, borderWidth: 1 }, featureIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, doubleGrid: { flexDirection: 'row-reverse', gap: 10 }, metric: { flex: 1, minHeight: 122, gap: 7, borderWidth: 1 }, metricIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' } });
