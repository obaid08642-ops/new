import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { UrgentHelpView, parseShareResult } from '../../components/emergency/UrgentHelpView';
import { message } from '../../components/screen/ScreenKit';
import { parseUrgentHelp } from '../../utils/urgent-help';

/**
 * Owner decision 14 (2026-10-10): the one urgent-help screen. Every value is a TEST value. What is proved: the number comes
 * from GET /mental-health/urgent-help (never from the app), a number gives a `tel:` button, no number gives no button and an
 * honest message, and the removed SOS routes redirect to /emergency.
 */

const mockApi = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() },
  useLocalSearchParams: () => ({}),
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text testID="redirect">{href}</Text>;
  },
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('expo-image-picker', () => ({}));
const mockPermission = jest.fn();
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: () => mockPermission(),
  getCurrentPositionAsync: async () => ({ coords: { latitude: 24.7, longitude: 46.6 } }),
}));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/api', () => ({ ...jest.requireActual('../../utils/api'), apiFetch: (...a: unknown[]) => mockApi(...a) }));

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

beforeEach(() => {
  mockApi.mockReset();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
});

describe('parseUrgentHelp', () => {
  it('reads a dialable number and nothing else', () => {
    expect(parseUrgentHelp({ phone: ' +966 11 555 0100 ', updated_at: null })).toEqual({ phone: '+966 11 555 0100', dial: '+966115550100' });
    expect(parseUrgentHelp({ data: { phone: '920012345' } })).toEqual({ phone: '920012345', dial: '920012345' });
    expect(parseUrgentHelp({ phone: null })).toBeNull();
    expect(parseUrgentHelp({ phone: '' })).toBeNull();
    expect(parseUrgentHelp({ phone: 'javascript:alert(1)' })).toBeNull();
    expect(parseUrgentHelp({ phone: '12' })).toBeNull();
    expect(parseUrgentHelp(null)).toBeNull();
  });
});

describe('UrgentHelpView', () => {
  it('shows a tel button with the number from the config', async () => {
    mockApi.mockResolvedValue({ phone: '+966115550100', updated_at: '2026-10-01T00:00:00Z' });
    await render(wrap(<UrgentHelpView />));
    expect(await screen.findByTestId('urgent-help-call')).toBeTruthy();
    expect(screen.getByText(k('emergency.call', { number: '⁦+966115550100⁩' }))).toBeTruthy();
    expect(mockApi).toHaveBeenCalledWith('/mental-health/urgent-help');
    await act(async () => {
      fireEvent.press(screen.getByTestId('urgent-help-call'));
    });
    expect(Linking.openURL).toHaveBeenCalledWith('tel:+966115550100');
    expect(screen.queryByTestId('urgent-help-unavailable')).toBeNull();
  });

  it('shows no button and an honest message when the config has no number', async () => {
    mockApi.mockResolvedValue({ phone: null, updated_at: null });
    await render(wrap(<UrgentHelpView />));
    expect(await screen.findByTestId('urgent-help-unavailable')).toBeTruthy();
    expect(screen.getByText(k('emergency.unavailable'))).toBeTruthy();
    expect(screen.queryByTestId('urgent-help-call')).toBeNull();
  });
});

describe('send my location to my family (decision 14, issue 665)', () => {
  const answer = (share: unknown) => mockApi.mockImplementation(async (path: string) => (path === '/emergency/share-location' ? share : { phone: null }));

  it('posts the device position and says how many contacts got it, with an SMS link for the others', async () => {
    mockPermission.mockResolvedValue({ status: 'granted' });
    answer({ notified: 2, sms_links: [{ name: 'Test contact', phone: '0500000000', href: 'sms:0500000000?body=x' }] });
    await render(wrap(<UrgentHelpView />));
    await act(async () => {
      fireEvent.press(await screen.findByTestId('urgent-help-share'));
    });
    expect(mockApi).toHaveBeenCalledWith('/emergency/share-location', { method: 'POST', body: JSON.stringify({ lat: 24.7, lng: 46.6 }) });
    expect(await screen.findByTestId('urgent-help-share-sent')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('urgent-help-sms-0'));
    });
    expect(Linking.openURL).toHaveBeenCalledWith('sms:0500000000?body=x');
  });

  it('sends nothing without the location permission', async () => {
    mockPermission.mockResolvedValue({ status: 'denied' });
    answer({ notified: 0, sms_links: [] });
    await render(wrap(<UrgentHelpView />));
    await act(async () => {
      fireEvent.press(await screen.findByTestId('urgent-help-share'));
    });
    expect(await screen.findByTestId('urgent-help-share-permission')).toBeTruthy();
    expect(mockApi).not.toHaveBeenCalledWith('/emergency/share-location', expect.anything());
  });

  it('reads only sms: links from the answer', () => {
    expect(parseShareResult({ notified: 1, sms_links: [{ name: 'A', href: 'javascript:x' }, { name: 'B', href: 'sms:1' }] })).toEqual({ notified: 1, sms: [{ name: 'B', href: 'sms:1' }] });
    expect(parseShareResult(null)).toBeNull();
  });
});

