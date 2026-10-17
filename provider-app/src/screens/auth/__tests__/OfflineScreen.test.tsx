import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { OfflineScreen } from '../OfflineScreen';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../../context', () => {
  const theme = new Proxy({}, { get: () => 'transparent' });
  return {
    useTheme: () => ({ theme, isDark: false }),
    useLang: () => ({ lang: 'en', isRTL: false, t: (k: string) => k }),
    useToast: () => ({ show: jest.fn() }),
  };
});

describe('OfflineScreen', () => {
  it('says the server cannot be reached, never that the account is under review, and retries on tap', async () => {
    const onRetry = jest.fn();
    await render(<OfflineScreen onRetry={onRetry} onLogout={() => {}} autoRetryMs={0} />);
    expect(screen.getByText('Cannot reach the server')).toBeTruthy();
    expect(screen.queryByText(/under review/i)).toBeNull();
    await fireEvent.press(screen.getByText('Try again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
  it('retries by itself while it is shown', async () => {
    jest.useFakeTimers();
    const onRetry = jest.fn();
    await render(<OfflineScreen onRetry={onRetry} onLogout={() => {}} autoRetryMs={1000} />);
    jest.advanceTimersByTime(3100);
    expect(onRetry).toHaveBeenCalledTimes(3);
    jest.useRealTimers();
  });
});
