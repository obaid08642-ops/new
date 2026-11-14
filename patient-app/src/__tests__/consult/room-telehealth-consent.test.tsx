import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RoomScreen from '../../../app/room/[id]';

/**
 * D-38: the call room (POST /calls/:id/join) answers 400 telehealth_consent_required until the patient has accepted the current
 * telehealth consent. The room then shows the consent sheet; accepting records it (POST /legal/accept/telehealth_consent) and
 * joins again. Every value is a TEST value.
 */

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({ id: 'session-1' }),
  Stack: { Screen: () => null },
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: true, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/deviceId', () => ({ getDeviceId: jest.fn(async () => 'device-test-1') }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn() }));
jest.mock('../../calls/livekitNative', () => ({ ensureLiveKitGlobals: jest.fn(), startCallAudio: jest.fn(async () => undefined), stopCallAudio: jest.fn(async () => undefined) }));
jest.mock('@/store/hooks', () => {
  const user = { id: 'user-1' }; // one object, as the store gives (a new one per render would run the join effect again)
  return { useAppSelector: () => user };
});
jest.mock('@livekit/react-native', () => ({
  LiveKitRoom: () => null,
  VideoTrack: () => null,
  useTracks: () => [],
  useLocalParticipant: () => ({ localParticipant: null }),
}), { virtual: true });
jest.mock('livekit-client', () => ({ Track: { Source: { Camera: 'camera' } } }), { virtual: true });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const posts = (path: string) => apiFetch.mock.calls.filter(([p, init]) => p === path && init?.method === 'POST');

it('shows the telehealth consent when the join is refused, records it, then joins again', async () => {
  let accepted = false;
  apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path === '/calls/session-1/join') {
      if (!accepted) throw new Error('telehealth_consent_required');
      return { token: 'test-token' };
    }
    if (path.startsWith('/legal/policy/telehealth_consent')) return { content: '## Test consent\nTest text', version: '2.0' };
    if (path === '/legal/accept/telehealth_consent' && init?.method === 'POST') {
      accepted = true;
      return {};
    }
    throw new Error(`unexpected ${path}`);
  });

  await render(wrap(<RoomScreen />));
  await waitFor(() => expect(screen.getByTestId('telehealth-consent-sheet')).toBeTruthy());
  expect(posts('/calls/session-1/join')).toHaveLength(1);

  await waitFor(() => expect(screen.getByTestId('telehealth-consent-accept').props.accessibilityState?.disabled).not.toBe(true));
  await act(async () => {
    fireEvent.press(screen.getByTestId('telehealth-consent-accept'));
  });

  await waitFor(() => expect(posts('/calls/session-1/join')).toHaveLength(2));
  expect(posts('/legal/accept/telehealth_consent')).toHaveLength(1);
  await waitFor(() => expect(screen.queryByTestId('telehealth-consent-sheet')).toBeNull());
});

it('does not show the consent for another join failure', async () => {
  apiFetch.mockRejectedValue(new Error('call_not_found'));
  await render(wrap(<RoomScreen />));
  await waitFor(() => expect(apiFetch).toHaveBeenCalled());
  expect(screen.queryByTestId('telehealth-consent-sheet')).toBeNull();
});
