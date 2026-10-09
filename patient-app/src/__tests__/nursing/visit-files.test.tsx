import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import NursingLiveTracking from '../../../app/nursing/live-tracking';
import { message } from '../../components/screen/ScreenKit';

/**
 * N1, patient side: once the visit is COMPLETED the result files the nurse attached (visit record attachments[]:
 * {storage_id, name, mime, at}) are listed, and tapping one asks GET /storage/:id/signed-url and opens that https url.
 * Answers are shaped like the backend's; every value is a TEST value.
 */
const mockParams: { current: Record<string, string | undefined> } = { current: { bookingId: 'visit-1', type: 'nurse' } };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams.current,
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../components/MapPrimitives', () => ({ __esModule: true, default: () => null, Marker: () => null, PROVIDER_DEFAULT: 'default' }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };
const k = (key: string) => message('en', key);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

function answer(attachments: unknown[], signed: () => unknown = () => ({ url: 'https://files.example.test/signed?x=1', expires_in: 300 })) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path === '/nursing/visits/visit-1/tracking') return { booking_id: 'visit-1', status: 'COMPLETED', vitals: { pulse: 70 }, notes: 'Test note' };
    if (path === '/nursing/visits/visit-1') return { id: 'visit-1', state: 'COMPLETED', attachments };
    if (path.startsWith('/storage/') && path.endsWith('/signed-url')) return signed();
    return {};
  });
}

describe('nursing visit result files (N1)', () => {
  beforeEach(() => { apiFetch.mockReset(); jest.spyOn(Linking, 'openURL').mockClear(); (Linking.openURL as jest.Mock).mockResolvedValue(true); });
  afterEach(() => jest.restoreAllMocks());

  it('lists the files the nurse attached and opens one through its signed url', async () => {
    answer([{ storage_id: 'f1', name: 'CBC result.pdf', mime: 'application/pdf', at: '2026-10-01T10:00:00Z' }, { storage_id: 'f2', name: 'wound.jpg', mime: 'image/jpeg' }]);
    await render(wrap(<NursingLiveTracking />));
    expect(await screen.findByText(k('nur.live.files'))).toBeTruthy();
    expect(screen.getByText('wound.jpg')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByText('CBC result.pdf')); });
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('https://files.example.test/signed?x=1'));
    expect(apiFetch).toHaveBeenCalledWith('/storage/f1/signed-url');
  });

  it('shows no files section when the nurse attached none', async () => {
    answer([]);
    await render(wrap(<NursingLiveTracking />));
    expect(await screen.findByText(k('nur.live.report'))).toBeTruthy();
    expect(screen.queryByText(k('nur.live.files'))).toBeNull();
  });

  it('says so and opens nothing when the signed url is refused', async () => {
    answer([{ storage_id: 'f1', name: 'CBC result.pdf' }], () => { throw new Error('403'); });
    await render(wrap(<NursingLiveTracking />));
    await act(async () => { fireEvent.press(await screen.findByText('CBC result.pdf')); });
    expect(await screen.findByText(k('nur.live.fileError'))).toBeTruthy();
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
