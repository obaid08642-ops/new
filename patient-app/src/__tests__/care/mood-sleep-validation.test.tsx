import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MoodJournalView } from '../../components/care/MentalHealthViews';
import { message } from '../../components/screen/ScreenKit';

/** Mood journal: sleep hours outside 0-24 shows the sleep-hours message and sends nothing. Every value is a TEST value. */
const mockApiFetch = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() }, useLocalSearchParams: () => ({}), useFocusEffect: () => undefined }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };

describe('MoodJournalView sleep hours', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue([]);
  });
  it('does not post 30 hours of sleep and says why', async () => {
    await render(<SafeAreaProvider initialMetrics={metrics}><MoodJournalView /></SafeAreaProvider>);
    await fireEvent.press(await screen.findByTestId('mood-good'));
    await fireEvent.changeText(screen.getByTestId('mood-sleep'), '30');
    await fireEvent.press(screen.getByTestId('mood-save'));
    await waitFor(() => expect(screen.getByText(message('en', 'health.sleep.badHours'))).toBeTruthy());
    expect(mockApiFetch.mock.calls.some((c) => c[0] === '/mental-health/mood' && c[1]?.method === 'POST')).toBe(false);
  });
});
