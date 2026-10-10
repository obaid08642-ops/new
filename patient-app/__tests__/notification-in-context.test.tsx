import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import { NotificationAsk } from '../src/components/NotificationAsk';
import { permissions } from '../src/services/PermissionsManager';
import { askNotificationsInContext, registerForPushNotificationsAsync } from '../src/utils/notifications';

/**
 * Owner decision 6 (2026-10-10): notifications are asked in context. The prompt shows where a feature needs them (offers
 * waiting for pharmacies, notification settings), the phone's dialog comes only from its "Turn on" button, a refusal shows
 * the phone's settings, and the app start never asks.
 */

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));
jest.mock('react-native-localize', () => ({ getLocales: () => [{ languageCode: 'en' }], getCalendar: () => 'gregorian' }));
jest.mock('../src/context/AppContext', () => ({
  ...jest.requireActual('../src/context/AppContext'),
  useApp: () => ({ isDark: false, lang: 'en', isRTL: false, setLang: jest.fn() }),
}));
jest.mock('../src/services/PermissionsManager', () => ({ permissions: { check: jest.fn(), request: jest.fn() } }));
jest.mock('../src/utils/api', () => ({ ...jest.requireActual('../src/utils/api'), apiFetch: jest.fn() }));
jest.mock('expo-device', () => ({ isDevice: true, modelName: 'Test' }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getDevicePushTokenAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { MAX: 5, DEFAULT: 3 },
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const show = () => render(<SafeAreaProvider initialMetrics={metrics}><NotificationAsk bodyKey="notifAsk.offers" /></SafeAreaProvider>);

beforeEach(() => {
  jest.clearAllMocks();
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined' });
});

describe('NotificationAsk (the in-context prompt)', () => {
  it('not asked yet: shows the reason and the button, and asks nothing until the button is pressed', async () => {
    (permissions.check as jest.Mock).mockResolvedValue('undetermined');
    await show();
    await waitFor(() => expect(screen.getByText(/as soon as pharmacies send offers/)).toBeTruthy());
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    await fireEvent.press(screen.getByLabelText('Turn on notifications'));
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByLabelText('Turn on notifications')).toBeNull());
  });

  it('refused: says so and offers the phone settings (the dialog cannot be shown again)', async () => {
    (permissions.check as jest.Mock).mockResolvedValue('undetermined');
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await show();
    await fireEvent.press(await screen.findByLabelText('Turn on notifications'));
    await fireEvent.press(await screen.findByLabelText('Open phone settings'));
    expect(open).toHaveBeenCalled();
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('already allowed: draws nothing', async () => {
    (permissions.check as jest.Mock).mockResolvedValue('granted');
    await show();
    await waitFor(() => expect(permissions.check).toHaveBeenCalled());
    expect(screen.queryByLabelText('Turn on notifications')).toBeNull();
    expect(screen.queryByLabelText('Open phone settings')).toBeNull();
  });
});

describe('push registration at app start never shows the phone dialog', () => {
  it('not allowed: returns without asking', async () => {
    expect(await registerForPushNotificationsAsync()).toBeNull();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('askNotificationsInContext is the one place that asks', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    expect(await askNotificationsInContext()).toBe('denied');
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });
});
