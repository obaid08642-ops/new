import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { UrgentHelpView } from '../../components/emergency/UrgentHelpView';
import { message } from '../../components/screen/ScreenKit';
import { parseUrgentHelp } from '../../utils/urgent-help';
import EmergencySos from '../../../app/emergency/sos';
import EmergencySosActive from '../../../app/emergency/sos-active';
import EmergencyTracking from '../../../app/emergency/tracking';

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

describe('the removed SOS routes', () => {
  it.each([
    ['sos', EmergencySos],
    ['sos-active', EmergencySosActive],
    ['tracking', EmergencyTracking],
  ])('/emergency/%s redirects to /emergency', async (_name, Screen) => {
    await render(<Screen />);
    expect(screen.getByTestId('redirect').props.children).toBe('/emergency');
  });
});
