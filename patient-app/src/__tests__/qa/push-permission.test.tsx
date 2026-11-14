import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotificationAsk } from '../../components/NotificationAsk';
import { askNotificationsInContext, registerForPushNotificationsAsync } from '../../utils/notifications';
import { translations } from '../../i18n';

/** PT-29: the phone's notification permission is denied. No crash, no endless prompting, no token registered, a way to the phone's settings. TEST values only. */

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() } }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('expo-device', () => ({ isDevice: true, modelName: 'Test device' }));
jest.mock('../../utils/callkeep', () => ({ canRingNatively: () => false }));
jest.mock('../../utils/api', () => ({ apiFetch: jest.fn(async () => ({ ok: true })) }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[test]' })),
  getDevicePushTokenAsync: jest.fn(async () => ({ data: 'test-native' })),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { MAX: 5 },
}));
jest.mock('../../services/PermissionsManager', () => ({ permissions: { check: jest.fn() } }));

/* eslint-disable @typescript-eslint/no-require-imports */
const N = require('expo-notifications') as { getPermissionsAsync: jest.Mock; requestPermissionsAsync: jest.Mock; getExpoPushTokenAsync: jest.Mock; getDevicePushTokenAsync: jest.Mock };
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };
const { permissions } = require('../../services/PermissionsManager') as { permissions: { check: jest.Mock } };
/* eslint-enable @typescript-eslint/no-require-imports */

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const en = translations.en as Record<string, string>;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_PROJECT_ID = '12345678-1234-1234-1234-123456789012';
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

describe('notification permission denied (PT-29)', () => {
  it('app start with the permission denied registers nothing and does not ask', async () => {
    N.getPermissionsAsync.mockResolvedValue({ status: 'denied' });
    await expect(registerForPushNotificationsAsync()).resolves.toBeNull();
    expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('"Turn on" answered with denied registers no token and reports denied', async () => {
    N.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    await expect(askNotificationsInContext()).resolves.toBe('denied');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('a failing permission request does not throw and counts as denied', async () => {
    N.requestPermissionsAsync.mockRejectedValue(new Error('test failure'));
    await expect(askNotificationsInContext()).resolves.toBe('denied');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('when allowed the token is registered with the backend (control)', async () => {
    N.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    await expect(registerForPushNotificationsAsync()).resolves.toBe('ExponentPushToken[test]');
    expect(apiFetch).toHaveBeenCalledWith('/notifications/register-token', expect.objectContaining({ method: 'POST' }));
  });

  it('the prompt for a denied permission explains it and opens the phone settings, without asking again', async () => {
    permissions.check.mockResolvedValue('denied');
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await render(<SafeAreaProvider initialMetrics={metrics}><NotificationAsk bodyKey="notifAsk.settings" /></SafeAreaProvider>);
    expect(await screen.findByText(en['notifAsk.blocked'])).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByLabelText(en['notifAsk.openSettings'])); });
    expect(open).toHaveBeenCalledTimes(1);
    expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('the prompt for a permission not asked yet shows the reason and Turn on; an allowed one draws nothing', async () => {
    permissions.check.mockResolvedValue('undetermined');
    await render(<SafeAreaProvider initialMetrics={metrics}><NotificationAsk bodyKey="notifAsk.settings" /></SafeAreaProvider>);
    expect(await screen.findByText(en['notifAsk.settings'])).toBeTruthy();
    expect(screen.getByLabelText(en['notifAsk.turnOn'])).toBeTruthy();
    screen.unmount();
    permissions.check.mockResolvedValue('granted');
    await render(<SafeAreaProvider initialMetrics={metrics}><NotificationAsk bodyKey="notifAsk.settings" /></SafeAreaProvider>);
    await act(async () => undefined);
    expect(screen.queryByLabelText(en['notifAsk.turnOn'])).toBeNull();
    expect(screen.queryByText(en['notifAsk.blocked'])).toBeNull();
  });
});
