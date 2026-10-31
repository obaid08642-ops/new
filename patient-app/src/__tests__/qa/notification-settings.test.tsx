import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotificationSettingsView } from '../../components/account/SettingsViews';
import { translations } from '../../i18n';

/** PT-28: the notification switches save with PATCH /users/me/notification-settings, a failed save puts the switch back and says so, and the emergency kind cannot be switched off. TEST values only. */

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() },
  useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: () => void | (() => void)) => require('react').useEffect(cb, [cb]),
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../components/NabdLogo', () => ({ NabdLogo: () => null }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn() }));
jest.mock('../../components/NotificationAsk', () => ({ NotificationAsk: () => null }));

/* eslint-disable @typescript-eslint/no-require-imports */
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };
/* eslint-enable @typescript-eslint/no-require-imports */
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const en = translations.en as Record<string, string>;
const patches = () => apiFetch.mock.calls.filter(([, init]) => init?.method === 'PATCH');
const open = async () => { await render(<SafeAreaProvider initialMetrics={metrics}><NotificationSettingsView /></SafeAreaProvider>); await screen.findByTestId('notification-kinds'); };

beforeEach(() => { apiFetch.mockReset(); });

describe('notification preferences (PT-28)', () => {
  it('toggling a kind sends PATCH with that one field', async () => {
    apiFetch.mockImplementation(async (_p: string, init?: RequestInit) => (init?.method ? { ok: true } : { appointments: true }));
    await open();
    await act(async () => { fireEvent.press(screen.getByTestId('notif-appointments')); });
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0][0]).toBe('/users/me/notification-settings');
    expect(JSON.parse(patches()[0][1].body)).toEqual({ appointments: false });
    expect(screen.queryByText(en['set.saveFailed'])).toBeNull();
  });

  it('a failed save shows the message and the switch goes back', async () => {
    apiFetch.mockImplementation(async (_p: string, init?: RequestInit) => { if (init?.method) throw new Error('test failure'); return { appointments: true }; });
    await open();
    await act(async () => { fireEvent.press(screen.getByTestId('notif-appointments')); });
    expect(await screen.findByText(en['set.saveFailed'])).toBeTruthy();
    expect(screen.getByTestId('notif-appointments').props.accessibilityState.checked).toBe(true);
  });

  it('the emergency kind is locked: the switch is disabled and nothing is sent', async () => {
    apiFetch.mockResolvedValue({});
    await open();
    const sw = screen.getByTestId('notif-emergency');
    expect(sw.props.accessibilityState.disabled).toBe(true);
    await act(async () => { fireEvent.press(sw); });
    expect(patches()).toHaveLength(0);
  });
});
