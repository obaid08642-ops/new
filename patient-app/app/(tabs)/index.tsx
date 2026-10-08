import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useDispatch } from 'react-redux';

import { Screen, Skeleton, SectionHeader, useTabBarHeight } from '../../../packages/ui-native/src';
import { useApp } from '../../src/context/AppContext';
import { apiFetch } from '../../src/utils/api';
import { healthDayT } from '../../src/i18n/health-day';
import HomeSections from '../../src/components/HomeSections';
import { HomeTopRow } from '../../src/components/home/HomeTopRow';
import { PHONE_COLUMN, useScreenUi } from '../../src/components/home/homeKit';
import {
  AiCard,
  AllServicesRow,
  AppointmentCard,
  DayRecords,
  GreetingCard,
  LoadBanner,
  PointsCard,
  ReminderCard,
  ServiceGrid,
  ToolsRow,
  type DayRow,
  type UpcomingAppointment,
} from '../../src/components/home/HomeParts';
import { HOME_SERVICES, HOME_TOOLS } from '../../src/features/home/homeItems';
import { setUnreadCount } from '../../src/store/slices/notificationsSlice';

/**
 * Home — board HomeApp / HomeAppDark (canvas/HomeApp.dc.html).
 *
 * Top row, greeting card, health reminder, the nine services, the AI assistant, the AI tools, all services,
 * the next appointment, the curated offers and packages, and the points card. Every block that depends on
 * data is drawn only when the data is there. The records the screen already fetched (meals and water, vitals,
 * mood, maternity) are kept as one "your records" card of ListItem rows, since the board has no place for them.
 */

type DoseStatus = 'pending' | 'taken' | 'skipped' | 'missed';
type Dose = { time_key: string; status: DoseStatus };
type Reminder = { id: string; medicine_name_ar?: string; medicine_name_en?: string; dose?: string; active?: boolean; times?: string[]; today_doses?: Dose[] };
type NutritionSummary = { meals_count?: number; water?: { consumed_ml?: number; target_ml?: number | null } };
type MaternityProfile = { profile_ready?: boolean; tracking_mode?: 'pregnancy' | 'cycle' | null; is_pregnant?: boolean };
type MoodEntry = { logged_at?: string; createdAt?: string };
/** GET /users/me/display: the signed-in patient's public card (the name is the user record's, set at registration). */
type Display = { display_name?: string | null };
/** GET /loyalty/account: the points the patient holds. */
type LoyaltyAccount = { points?: number | null };
type NotificationRow = { read?: boolean };
type Payload<T> = { data?: T } | T | null | undefined;
const unwrap = <T,>(value: Payload<T>): T | undefined => (value && typeof value === 'object' && 'data' in value ? (value as { data?: T }).data : (value as T | undefined));
const localDate = (value?: string) => (value ? new Date(value).toDateString() : '');

export default function HomeScreen() {
  const { lang } = useApp();
  const { theme, c, tr } = useScreenUi();
  const barHeight = useTabBarHeight();
  const t = (key: Parameters<typeof healthDayT>[1], vars?: Record<string, string | number>) => healthDayT(lang, key, vars);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(0);
  const dispatch = useDispatch();
  const [display, setDisplay] = useState<Display | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [nutrition, setNutrition] = useState<NutritionSummary | null>(null);
  const [maternity, setMaternity] = useState<MaternityProfile | null>(null);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[] | null>(null);
  const [vitals, setVitals] = useState<unknown[]>([]);
  const [appointment, setAppointment] = useState<UpcomingAppointment | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    const results = await Promise.allSettled([
      apiFetch('/users/me/display'), apiFetch('/health/reminders'), apiFetch('/nutrition/daily-summary'),
      apiFetch('/maternity/profile'), apiFetch('/mental-health/mood?days=1'), apiFetch('/health/vitals/summary'), apiFetch('/home/upcoming-appointment'),
      apiFetch('/notifications'), apiFetch('/loyalty/account'),
    ]);
    const value = (index: number) => (results[index].status === 'fulfilled' ? (results[index] as PromiseFulfilledResult<unknown>).value : undefined);
    const rows = <T,>(index: number): T[] | null => {
      const v = unwrap<T[]>(value(index) as Payload<T[]>);
      return Array.isArray(v) ? v : null;
    };
    setDisplay(unwrap<Display>(value(0) as Payload<Display>) || null);
    setReminders(rows<Reminder>(1) ?? []);
    setNutrition(unwrap<NutritionSummary>(value(2) as Payload<NutritionSummary>) || null);
    setMaternity(unwrap<MaternityProfile>(value(3) as Payload<MaternityProfile>) || null);
    setMoodEntries(rows<MoodEntry>(4));
    setVitals(rows<unknown>(5) ?? []);
    setAppointment(unwrap<UpcomingAppointment>(value(6) as Payload<UpcomingAppointment>) || null);
    // the bell's dot: the real unread rows of GET /notifications; unknown (null) when the call failed, so no dot
    const notificationRows = rows<NotificationRow>(7);
    dispatch(setUnreadCount(notificationRows ? notificationRows.filter((row) => !row.read).length : null));
    // the points card shows a number only when the API returned one
    const loyalty = unwrap<LoyaltyAccount>(value(8) as Payload<LoyaltyAccount>);
    setPoints(typeof loyalty?.points === 'number' && Number.isFinite(loyalty.points) ? loyalty.points : null);
    setFailed(results.filter((item) => item.status === 'rejected').length);
    setLoading(false);
    setRefreshing(false);
  }, [dispatch]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const doseSummary = useMemo(() => {
    const active = reminders.filter((item) => item.active !== false);
    const doses = active.flatMap((reminder) => (reminder.today_doses?.length ? reminder.today_doses : (reminder.times || []).map((time_key) => ({ time_key, status: 'pending' as DoseStatus }))).map((dose) => ({ reminder, ...dose })));
    return { total: doses.length, taken: doses.filter((item) => item.status === 'taken').length, next: doses.filter((item) => item.status === 'pending').sort((a, b) => a.time_key.localeCompare(b.time_key))[0], activeCount: active.length };
  }, [reminders]);

  // the user record's name from /users/me/display; empty (a guest, or no name yet) hides the name everywhere
  const patientName = typeof display?.display_name === 'string' && display.display_name.trim() ? display.display_name.trim() : null;
  const goReminders = () => router.push('/health/medications?tab=reminders');

  // The reminder card: the next dose, or that today's doses are done; nothing when there are no active reminders.
  const reminder = doseSummary.next
    ? {
        title: doseSummary.next.reminder.medicine_name_ar || doseSummary.next.reminder.medicine_name_en || t('medications'),
        subtitle: [doseSummary.next.reminder.dose, doseSummary.next.time_key].filter(Boolean).join(' · '),
      }
    : doseSummary.activeCount
      ? { title: t('allCaughtUp'), subtitle: doseSummary.total ? t('medicationProgress', { taken: doseSummary.taken, scheduled: doseSummary.total }) : '' }
      : null;

  const water = nutrition?.water?.consumed_ml ?? 0;
  const mealCount = nutrition?.meals_count ?? 0;
  const moodLoggedToday = (moodEntries ?? []).some((entry) => localDate(entry.logged_at || entry.createdAt) === new Date().toDateString());
  const records: DayRow[] = [];
  if (mealCount > 0 || water > 0) {
    records.push({ key: 'nutrition', service: 'nutrition', title: t('nutrition'), subtitle: [mealCount > 0 ? t('mealsCount', { count: mealCount }) : '', water > 0 ? t('waterAmount', { count: water }) : ''].filter(Boolean).join(' · '), route: '/nutrition/daily-tracker' });
  }
  if (vitals.length > 0) records.push({ key: 'vitals', service: 'health', title: t('vitals'), subtitle: t('updated'), route: '/health/vitals' });
  if (moodEntries) records.push({ key: 'mood', service: 'mind', title: t('mood'), subtitle: moodLoggedToday ? t('moodLogged') : t('moodNotLogged'), route: '/mental-health/mood-journal' });
  if (maternity?.profile_ready) records.push({ key: 'maternity', service: 'maternity', title: t('maternity'), subtitle: maternity.is_pregnant ? t('maternityPregnancy') : t('maternityCycle'), route: '/maternity/hub' });

  const goAppointment = () => (appointment?.id ? router.push({ pathname: '/consultations/appointment-detail', params: { appointmentId: appointment.id } }) : router.push('/(tabs)/consultations'));
  const hasAppointment = Boolean(appointment && (appointment.doctorName || appointment.type || appointment.time || appointment.date));

  return (
    <Screen
      scroll
      theme={theme}
      edges={['top', 'start', 'end']}
      bottomSpace={barHeight + 40}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={c.action.primary.bg} />}
    >
      <View style={{ ...PHONE_COLUMN, paddingTop: 7, gap: 16 }}>
        <HomeTopRow name={patientName} />
        <GreetingCard name={patientName} />
        {failed > 0 && !loading ? <LoadBanner message={t('error')} retryLabel={t('retry')} onRetry={() => void load(true)} /> : null}
        {loading ? <Skeleton variant="block" theme={theme} /> : reminder ? <ReminderCard label={tr('home.reminder')} title={reminder.title} subtitle={reminder.subtitle} onPress={goReminders} /> : null}
        <ServiceGrid items={HOME_SERVICES} />
        <AiCard onPress={() => router.push('/ai')} />
        <ToolsRow tools={HOME_TOOLS} />
        <AllServicesRow onPress={() => router.push('/services')} />
        {hasAppointment && appointment ? (
          <View style={{ gap: 10 }}>
            <SectionHeader title={tr('home.nextAppointment')} actionLabel={tr('home.allAppointments')} onActionPress={() => router.push('/consultations/appointments')} theme={theme} />
            <AppointmentCard appointment={appointment} onDetails={goAppointment} detailsLabel={tr('home.details')} />
          </View>
        ) : null}
        <DayRecords title={t('healthRecords')} rows={records} />
        <HomeSections />
        <PointsCard points={points} onPress={() => router.push('/loyalty/hub')} />
      </View>
    </Screen>
  );
}
