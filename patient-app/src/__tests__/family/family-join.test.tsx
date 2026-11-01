import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FamilyAddView } from '../../components/family/FamilyAddView';
import { message } from '../../components/screen/ScreenKit';

/** Join with a code: the failure line is the translated one, never the server's raw message. Every value is a TEST value. */
const mockApiFetch = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() }, useLocalSearchParams: () => ({ tab: 'join' }) }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('expo-camera', () => ({ CameraView: () => null, useCameraPermissions: () => [{ granted: false }, jest.fn()] }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };

describe('FamilyAddView join', () => {
  beforeEach(() => mockApiFetch.mockReset());
  it('posts the code and shows the translated failure, not the server message', async () => {
    mockApiFetch.mockRejectedValue(new Error('ERR_RAW_SERVER_CODE'));
    await render(<SafeAreaProvider initialMetrics={metrics}><FamilyAddView /></SafeAreaProvider>);
    await fireEvent.changeText(await screen.findByTestId('join-code'), 'abc123');
    await fireEvent.press(screen.getByTestId('join-submit'));
    await waitFor(() => expect(screen.getByText(message('en', 'family.join.failed'))).toBeTruthy());
    expect(screen.queryByText(/ERR_RAW_SERVER_CODE/)).toBeNull();
    const call = mockApiFetch.mock.calls.find((c) => c[0] === '/family/join');
    expect(call?.[1].method).toBe('POST');
    expect(JSON.parse(call?.[1].body).invite_code).toBe('ABC123');
  });
});
