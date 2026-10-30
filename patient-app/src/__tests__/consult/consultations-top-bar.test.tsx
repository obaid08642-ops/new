import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ConsultationsHub from '../../../app/(tabs)/consultations/index';
import AppointmentsScreen from '../../../app/consultations/appointments';
import { message } from '../../components/screen/ScreenKit';

/** Owner 2026-10-30: the consultations header has no cart; it has the "My appointments" button with the count of unopened results. */
const mockAppointments = [
  { id: 'u1', status: 'CONFIRMED', docName: 'Test Upcoming', at: '2026-11-01T09:00:00.000Z' },
  { id: 'c1', status: 'IN_PROGRESS', docName: 'Test Current', at: '2026-10-30T09:00:00.000Z' },
  { id: 'p1', status: 'COMPLETED', docName: 'Test Past', at: '2026-10-01T09:00:00.000Z' },
];
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(cb, []);
  },
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../context/ConsultationsContext', () => ({
  useConsultations: () => ({ appointments: mockAppointments, isLoading: false, error: null, fetchAppointments: jest.fn(async () => undefined) }),
}));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn(), newIdempotencyKey: jest.fn(() => 'key-1') }));
jest.mock('../../utils/publicCache', () => ({ fetchPublicList: jest.fn(async () => []) }));
jest.mock('../../components/search/ScopedSuggest', () => ({ ScopedSuggest: () => null }));
jest.mock('../../components/nav/HeaderMenuButton', () => ({ HeaderMenuButton: () => null }));
jest.mock('../../components/pharmacy/PharmacyKit', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const actual = jest.requireActual('../../components/pharmacy/PharmacyKit');
  return { ...actual, WishlistButton: () => null };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRouter = (require('expo-router') as { router: { push: jest.Mock } }).router;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };
const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

beforeEach(() => jest.clearAllMocks());

describe('consultations top bar', () => {
  it('has no cart button and a My appointments button with the count of unopened results', async () => {
    apiFetch.mockImplementation(async (path: string) =>
      path.startsWith('/medical-reports/mine') ? [{ id: 'r1', appointment_id: 'u1', viewed_by_patient: false }, { id: 'r2', appointment_id: 'p1', viewed_by_patient: true }] : [],
    );
    await render(wrap(<ConsultationsHub />));
    expect(screen.queryByTestId('cart-button')).toBeNull();
    const button = await screen.findByTestId('consult-appointments-entry');
    await waitFor(() => expect(screen.getByTestId('consult-appointments-entry').props.accessibilityLabel).toBe(k('consult.appt.titleNew', { n: 1 })));
    await act(async () => {
      fireEvent.press(button);
    });
    expect(mockRouter.push).toHaveBeenCalledWith('/consultations/appointments');
  });

  it('shows no badge when the server reports nothing new', async () => {
    apiFetch.mockResolvedValue([]);
    await render(wrap(<ConsultationsHub />));
    const button = await screen.findByTestId('consult-appointments-entry');
    expect(button.props.accessibilityLabel).toBe(k('consult.appt.title'));
  });
});

describe('my appointments tabs', () => {
  it('lists upcoming, current and past appointments on their own tab', async () => {
    apiFetch.mockResolvedValue([]);
    await render(wrap(<AppointmentsScreen />));
    expect(await screen.findByText('Test Upcoming')).toBeTruthy();
    expect(screen.queryByText('Test Current')).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByText(k('consult.appt.current')));
    });
    expect(await screen.findByText('Test Current')).toBeTruthy();
    expect(screen.queryByText('Test Past')).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByText(k('consult.appt.past')));
    });
    expect(await screen.findByText('Test Past')).toBeTruthy();
  });
});
