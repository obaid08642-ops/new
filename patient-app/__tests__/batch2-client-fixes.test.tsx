import React from 'react';
import { act, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Boundaries only: the API and the router.
const mockApiFetch = jest.fn();
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.mock('../src/utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../src/utils/logger', () => ({ logError: jest.fn() }));
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('../src/context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'ar', isRTL: true }) }));

import IncomingCall from '../app/consultations/incoming-call';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };

describe('incoming call ring timeout', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    jest.clearAllMocks();
    mockParams = { sessionId: 'sess-1', callType: 'video', callerName: 'Dr. Test' };
    mockApiFetch.mockResolvedValue({});
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('rejects the call once after 35 s of ringing, even when React runs effects and updaters twice', async () => {
    await render(
      <React.StrictMode>
        <SafeAreaProvider initialMetrics={metrics}>
          <IncomingCall />
        </SafeAreaProvider>
      </React.StrictMode>,
    );

    await act(async () => {
      jest.advanceTimersByTime(35_000);
    });
    expect(mockApiFetch).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    const rejects = mockApiFetch.mock.calls.filter(([path]) => path === '/calls/sess-1/reject');
    expect(rejects).toHaveLength(1);
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});
