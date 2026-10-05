import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Boundaries only: the API, navigation, safe area and app context. The screen's own logic runs for real.
const mockApiFetch = jest.fn();
jest.mock('../src/utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a) }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
// Entry animations only (the native worklets runtime is not available under jest).
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  const chain: { delay: () => unknown; duration: () => unknown } = { delay: () => chain, duration: () => chain };
  return { __esModule: true, default: { View }, FadeInDown: chain };
});
jest.mock('../src/context/AppContext', () => {
  const colors = new Proxy({}, { get: () => '#111111' });
  const useApp = () => ({ colors, isDark: false, lang: 'ar' });
  return { useApp, useThemeColors: () => colors };
});

import NotificationsSettingsScreen from '../app/settings/notifications-settings';

// Render order of the switches on the screen.
const ORDER = ['general', 'appointments', 'orders', 'offers', 'medications', 'doctorMessages', 'emergency', 'sound', 'vibration'];
const switches = () => screen.getAllByRole('switch');
const valueOf = (key: string) => switches()[ORDER.indexOf(key)].props.value;

const SERVER = {
  channels: { push: true, email: true, sms: false },
  categories: { appointments: true, orders: true, health: false, chat: true, account: true, marketing: false },
};

beforeEach(async () => {
  mockApiFetch.mockReset();
  await AsyncStorage.clear();
});

describe('notifications settings screen (Q38)', () => {
  it('shows the saved nested server state after a reload (medications and offers off)', async () => {
    mockApiFetch.mockResolvedValueOnce(SERVER);
    await render(<NotificationsSettingsScreen />);
    await waitFor(() => expect(valueOf('medications')).toBe(false));
    expect(valueOf('offers')).toBe(false);
    expect(valueOf('orders')).toBe(true);
    expect(valueOf('general')).toBe(true);
    expect(mockApiFetch).toHaveBeenCalledWith('/users/me/notification-settings');
  });

  it('sends the nested shape and reverts the switch with an error when the PATCH fails', async () => {
    mockApiFetch.mockResolvedValueOnce(SERVER);
    await render(<NotificationsSettingsScreen />);
    await waitFor(() => expect(valueOf('general')).toBe(true));

    mockApiFetch.mockRejectedValueOnce(new Error('notification_setting_not_allowed'));
    await fireEvent(switches()[ORDER.indexOf('general')], 'valueChange', false);

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/users/me/notification-settings', expect.objectContaining({ method: 'PATCH' })));
    const patch = mockApiFetch.mock.calls.find((c) => c[1]?.method === 'PATCH');
    expect(JSON.parse(patch[1].body)).toEqual({ channels: { push: false } });
    expect(await screen.findByText('تعذر حفظ الإعداد. أعدنا المفتاح إلى حالته السابقة.')).toBeTruthy();
    expect(valueOf('general')).toBe(true);
  });

  it('keeps sound on the device without calling the server', async () => {
    mockApiFetch.mockResolvedValueOnce(SERVER);
    await render(<NotificationsSettingsScreen />);
    await waitFor(() => expect(valueOf('sound')).toBe(true));
    await fireEvent(switches()[ORDER.indexOf('sound')], 'valueChange', false);
    await waitFor(() => expect(valueOf('sound')).toBe(false));
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    const stored = await AsyncStorage.getItem('nabd.notification-device-settings');
    expect(JSON.parse(String(stored))).toEqual({ sound: false, vibration: true });
  });
});
