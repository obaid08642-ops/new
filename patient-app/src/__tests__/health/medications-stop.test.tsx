import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MedicationsView } from '../../components/health/MedicationsView';
import { message } from '../../components/screen/ScreenKit';

/** 15.3: turning a reminder off is optimistic; a forced 500 brings it back and says why. */
const mockParams: { current: Record<string, string> } = { current: { tab: 'reminders' } };
const mockApi = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() },
  useLocalSearchParams: () => mockParams.current,
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApi(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../../utils/medication-notifications', () => ({
  cancelMedicationNotifications: jest.fn(async () => undefined),
  cancelMedicationSnoozes: jest.fn(async () => undefined),
  getMedicationNotificationPreferences: jest.fn(async () => ({})),
  scheduleMedicationNotifications: jest.fn(async () => ({ permissionDenied: false })),
  setMedicationNotificationPreferences: jest.fn(async () => undefined),
  medicationDisplayName: (r: { medicine_name_en?: string }) => r.medicine_name_en ?? '',
}));

const k = (key: string) => message('en', key);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const reminder = { id: 'r1', medicine_name_en: 'Test medicine', dose: '1 tablet', active: true, times: ['08:00'], frequency: 'daily' };

const serve = (patch: () => unknown) =>
  mockApi.mockImplementation(async (path: string, init?: { method?: string }) => {
    if (init?.method === 'PATCH') {
      const r = patch();
      if (r instanceof Error) throw r;
      return r;
    }
    if (path.startsWith('/health/reminders')) return [reminder];
    return [];
  });

describe('15.3 turning a reminder off', () => {
  beforeEach(() => { mockApi.mockReset(); });

  it('a forced 500 brings the reminder back and shows the error', async () => {
    serve(() => Object.assign(new Error('Internal Server Error'), { status: 500 }));
    await render(<SafeAreaProvider initialMetrics={metrics}><MedicationsView /></SafeAreaProvider>);
    await waitFor(() => expect(screen.getAllByText(/Test medicine/).length).toBeGreaterThan(0));
    await fireEvent.press(screen.getByLabelText(k('health.med.stopReminder')));
    await waitFor(() => expect(screen.getByText(k('health.med.stopError'))).toBeTruthy());
    expect(screen.getAllByText(/Test medicine/).length).toBeGreaterThan(0);
  });

  it('when the server accepts, the reminder is off and no error shows', async () => {
    serve(() => ({ ok: true }));
    await render(<SafeAreaProvider initialMetrics={metrics}><MedicationsView /></SafeAreaProvider>);
    await waitFor(() => expect(screen.getAllByText(/Test medicine/).length).toBeGreaterThan(0));
    mockApi.mockImplementation(async (path: string, init?: { method?: string }) => (init?.method === 'PATCH' ? { ok: true } : []));
    await fireEvent.press(screen.getByLabelText(k('health.med.stopReminder')));
    await waitFor(() => expect(screen.queryAllByText(/Test medicine/).length).toBe(0));
    expect(screen.queryByText(k('health.med.stopError'))).toBeNull();
    expect(mockApi).toHaveBeenCalledWith('/health/reminders/r1', { method: 'PATCH', body: JSON.stringify({ active: false }) });
  });
});
