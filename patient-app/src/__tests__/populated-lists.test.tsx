import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import NotificationsScreen from '../../app/notifications/index';
import AppointmentsScreen from '../../app/consultations/appointments';
import HomeScreen from '../../app/(tabs)/index';
import { MedicationsView } from '../components/health/MedicationsView';
import { MoodJournalView } from '../components/care/MentalHealthViews';
import { ConsultationsProvider } from '../context/ConsultationsContext';
import { message } from '../components/screen/ScreenKit';
import { healthDayT } from '../i18n/health-day';
import { dateLocaleFor } from '../utils/dates';
import { makeStore, withStore } from './utils/testStore';

/**
 * Issue 424: the lists of the patient app drawn with real rows, not only their empty state. Each fixture is one row as
 * the backend answers it (the source is named on each; the live journey tools/live/j_app_populated_lists.py reads the
 * same rows from a running backend after the patient books, adds a reminder and logs a mood). These are TEST values,
 * kept in the test only. What is proved: every field the row draws reaches the screen, in the reader's language.
 */

const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock('expo-router', () => {
  const ReactLib = jest.requireActual('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() },
    useLocalSearchParams: () => mockParams.current,
    useFocusEffect: (effect: () => void | (() => void)) => ReactLib.useEffect(effect, []),
  };
});
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../utils/api', () => ({ apiFetch: jest.fn(), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../components/NabdLogo', () => ({ NabdLogo: () => null }));
let mockLang = 'en';
jest.mock('../context/AppContext', () => {
  const real = jest.requireActual('../context/AppContext');
  return {
    LANGUAGES: real.LANGUAGES,
    useApp: () => ({ isDark: false, lang: mockLang, isRTL: mockLang === 'ar' || mockLang === 'ur', toggleTheme: jest.fn(), setLang: jest.fn() }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../utils/api') as { apiFetch: jest.Mock };

// Only the clock is faked, pinned to midday, so "today" and "tomorrow" do not move with the hour the suite runs.
jest.useFakeTimers({
  now: Date.parse('2026-10-05T12:00:00Z'),
  doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'hrtime', 'performance'],
});

const k = (key: string, vars?: Record<string, string | number>) => message(mockLang, key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const mount = (ui: React.ReactElement) => withStore(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>, makeStore());
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const MIN = 60_000;
const APPT_ID = 'b3d1c2a4-0000-4000-8000-000000000424';
const SLOT_START = '2026-10-06T07:00:00.000Z'; // tomorrow, 10:00 in Riyadh

/** A fake backend: each path answers its row(s); a path with no answer fails like an unreachable call. */
const backend = (answers: Record<string, unknown>) =>
  apiFetch.mockImplementation(async (path: string) => {
    const key = Object.keys(answers).find((p) => path === p || path.startsWith(`${p}?`));
    if (key === undefined) throw new Error('unreachable');
    return answers[key];
  });

/** GET /notifications?lang=en: NotificationsService.listForUser (the row, its resolved title/body, read, target, web_path). */
const NOTIFICATIONS = [
  {
    id: 'n-confirmed', user_id: 'u-424', title_key: 'notif.service.confirmed.title', body_key: 'notif.service.confirmed.body', params: {},
    type: 'order', priority: 'normal', action: { route: `/tracking/consultation/${APPT_ID}` }, delivery: {}, sent_push: false, status: 'SENT',
    createdAt: ago(2 * MIN), updatedAt: ago(2 * MIN),
    title: 'Your request is confirmed', body: 'The provider confirmed your request.', read: false,
    target: { kind: 'consultation_tracking', id: APPT_ID, web_path: null }, web_path: null,
  },
  {
    id: 'n-requested', user_id: 'u-424', title_key: 'notif.service.requested.title', body_key: 'notif.service.requested.body', params: {},
    type: 'order', priority: 'normal', action: { route: `/tracking/consultation/${APPT_ID}` }, delivery: {}, sent_push: false, status: 'SENT',
    createdAt: ago(3 * MIN), updatedAt: ago(3 * MIN),
    title: 'New service request', body: 'You have a new service request. Open it to respond.', read: true,
    target: { kind: 'consultation_tracking', id: APPT_ID, web_path: null }, web_path: null,
  },
];

/** GET /health/reminders: HealthService.listReminders (the saved reminder plus today_doses / taken / adherence). */
const REMINDERS = [
  {
    id: 'r-424', patient_id: 'u-424', medicine_name_ar: 'باراسيتامول 500 ملغ', dose: '500mg', dosage_count: 1, dosage_form: 'tablet',
    times: ['08:00', '20:00'], time_zone: 'Asia/Riyadh', frequency: 'daily', start_date: ago(5 * MIN), duration_days: 5,
    instructions_ar: 'بعد الأكل', source: 'manual', active: true, chronic: false, log: [], createdAt: ago(5 * MIN), updatedAt: ago(5 * MIN),
    today_doses: [{ time_key: '08:00', status: 'pending', logged_at: null }, { time_key: '20:00', status: 'pending', logged_at: null }],
    taken: false, adherence: { scheduled: 2, taken: 0 },
  },
];

/** GET /mental-health/mood?days=30: MentalHealthService.getMoodHistory (lean rows). */
const MOODS = [
  {
    _id: '6710f0a1c2b3d4e5f6a7b8c9', patient_id: 'u-424', mood: 'good', energy_level: 4, stress_level: 2, sleep_hours: 7,
    notes: 'A calm day', tags: ['calm'], logged_at: ago(4 * MIN), createdAt: ago(4 * MIN), updatedAt: ago(4 * MIN),
  },
];

/** GET /care/appointments: AppointmentsService.listMine (the stored row plus the doctor's name and the specialty names). */
const APPOINTMENTS = [
  {
    id: APPT_ID, patient_id: 'u-424', doctor_id: 'doc-424', doctor_user_id: 'doc-user-424', service_type: 'clinic',
    slot_start: SLOT_START, slot_end: '2026-10-06T07:30:00.000Z', duration_minutes: 30, status: 'CONFIRMED',
    state_history: [{ state: 'CONFIRMED', at: ago(MIN), by_user_id: 'system', by_role: 'system', note: 'payment-confirmed' }],
    price: 150, service_fee: 0, home_visit_fee: 0, transportation_fee: 0, total_price: 150, payment_status: 'paid', payment_method: 'card',
    symptoms: [], prescriptions: [], labRequests: [], radiologyRequests: [], sickLeaves: [], confirmed_at: ago(MIN), createdAt: ago(6 * MIN), updatedAt: ago(MIN),
    doctor_name: 'د. سالم الحربي', specialty_id: 'cardiology', specialty_ar: 'قلب', specialty_name_ar: 'قلب', specialty_name_en: 'Cardiology',
  },
];

/** GET /home/upcoming-appointment: HomeService.getUpcomingAppointment. */
const UPCOMING = { id: APPT_ID, date: '2026-10-06', doctorName: 'د. سالم الحربي', type: 'استشارة في العيادة', time: '10:00 ص', scheduled_at: SLOT_START, status: 'CONFIRMED' };

// the first screen of the file loads the shared kits and icon set, which takes longer than the default 5 s on a cold run
jest.setTimeout(30_000);

beforeEach(() => {
  apiFetch.mockReset();
  mockParams.current = {};
  mockLang = 'en';
});

describe('issue 424: populated lists', () => {
  it('Notifications draws each row of the feed: title, body, time and the unread mark', async () => {
    backend({ '/notifications': NOTIFICATIONS });
    await render(mount(<NotificationsScreen />));
    await waitFor(() => expect(screen.getByText('Your request is confirmed')).toBeTruthy());
    expect(apiFetch).toHaveBeenCalledWith('/notifications?lang=en');
    expect(screen.getByText('The provider confirmed your request.')).toBeTruthy();
    expect(screen.getByText('2 min ago')).toBeTruthy();
    expect(screen.getByText('New service request')).toBeTruthy();
    expect(screen.getByText('3 min ago')).toBeTruthy();
    expect(screen.getByLabelText('Your request is confirmed. The provider confirmed your request.. 2 min ago. New')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Today' })).toBeTruthy();
    expect(screen.queryByText(k('notifications.emptyTitle'))).toBeNull();
  });

  it('Medications "All reminders" draws the reminder: name, dose line, instructions and each dose time', async () => {
    mockParams.current = { tab: 'reminders' };
    backend({ '/health/reminders': REMINDERS });
    await render(mount(<MedicationsView />));
    await waitFor(() => expect(screen.getByTestId('reminder-r-424')).toBeTruthy());
    const fmtTime = (hm: string) => new Date(2000, 0, 1, Number(hm.slice(0, 2)), Number(hm.slice(3))).toLocaleTimeString(dateLocaleFor('en'), { hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' });
    expect(screen.getByText('باراسيتامول 500 ملغ')).toBeTruthy();
    expect(screen.getByText(`500mg · 1 ${k('health.med.unitsPerDose')} · ${k('health.med.daily')}`)).toBeTruthy();
    expect(screen.getByText('بعد الأكل')).toBeTruthy();
    expect(screen.getByText(k('health.med.doseTime', { time: fmtTime('08:00') }))).toBeTruthy();
    expect(screen.getByText(k('health.med.doseTime', { time: fmtTime('20:00') }))).toBeTruthy();
    expect(screen.getAllByText(k('health.med.takeDose'))).toHaveLength(2);
    expect(screen.queryByText(k('health.med.noReminders'))).toBeNull();
  });

  it('the mood journal history draws the entry: mood, date, note and tag', async () => {
    backend({ '/mental-health/mood': MOODS });
    await render(mount(<MoodJournalView />));
    await waitFor(() => expect(screen.getByText(`A calm day · ${k('care.mh.tagCalm')}`)).toBeTruthy());
    expect(apiFetch).toHaveBeenCalledWith('/mental-health/mood?days=30');
    const day = new Date(MOODS[0].logged_at).toLocaleDateString(dateLocaleFor('en'), { year: 'numeric', month: 'short', day: 'numeric', numberingSystem: 'latn' });
    expect(screen.getByText(k('care.mh.recordLabel', { date: day }))).toBeTruthy();
    // the mood's name is the row title (and also the choice tile of the form above it)
    expect(screen.getAllByText(k('care.mh.moodGood')).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(k('care.mh.noHistory'))).toBeNull();
  });

  it('My appointments draws the booking: doctor, specialty, start time, price, day tile, mode and status', async () => {
    backend({ '/care/appointments': APPOINTMENTS });
    await render(mount(<ConsultationsProvider><AppointmentsScreen /></ConsultationsProvider>));
    await waitFor(() => expect(screen.getByText('د. سالم الحربي')).toBeTruthy());
    const start = new Date(SLOT_START);
    const clock = start.toLocaleTimeString(dateLocaleFor('en'), { hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' });
    expect(screen.getByText(`Cardiology · ${clock} · 150.00 ${k('consult.currency')}`)).toBeTruthy();
    expect(screen.getByText(String(start.getDate()))).toBeTruthy();
    expect(screen.getByText(start.toLocaleDateString(dateLocaleFor('en'), { month: 'short', numberingSystem: 'latn' }))).toBeTruthy();
    expect(screen.getByText(k('consult.status.confirmed'))).toBeTruthy();
    expect(screen.getByText(k('consult.appt.directions'))).toBeTruthy();
    expect(screen.queryByText(k('consult.appt.emptyUpcoming'))).toBeNull();
  });

  it('My appointments in Arabic draws the Arabic specialty name', async () => {
    mockLang = 'ar';
    backend({ '/care/appointments': APPOINTMENTS });
    await render(mount(<ConsultationsProvider><AppointmentsScreen /></ConsultationsProvider>));
    await waitFor(() => expect(screen.getByText('د. سالم الحربي')).toBeTruthy());
    expect(screen.getByText(/^قلب · .+ · .+/)).toBeTruthy();
  });

  it('Home draws the reminder card, the mood record and the next appointment from the same rows', async () => {
    backend({
      '/users/me/display': { display_name: 'Test Patient', avatar_url: null, locale: 'en' },
      '/health/reminders': REMINDERS,
      '/nutrition/daily-summary': {},
      '/maternity/profile': {},
      '/mental-health/mood': MOODS,
      '/health/vitals/summary': [],
      '/home/upcoming-appointment': UPCOMING,
      '/notifications': NOTIFICATIONS,
      '/loyalty/account': { points: 0, lifetime_points: 0, tier: 'bronze' },
      '/content/home': { sections: [] },
    });
    await render(mount(<HomeScreen />));
    await waitFor(() => expect(screen.getByText('باراسيتامول 500 ملغ')).toBeTruthy());
    expect(screen.getByText('500mg · 08:00')).toBeTruthy();
    expect(screen.getByText(healthDayT('en', 'moodLogged'))).toBeTruthy();
    expect(screen.getByText('د. سالم الحربي')).toBeTruthy();
    expect(screen.getByText('استشارة في العيادة · 10:00 ص')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/mental-health/mood?days=1');
  });
});
