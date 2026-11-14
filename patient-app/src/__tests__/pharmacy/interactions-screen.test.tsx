import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import InteractionsScreen from '../../../app/pharmacy/interactions';
import { message } from '../../components/screen/ScreenKit';
import { addDrug, ixLevel } from '../../utils/interactionCheck';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => undefined,
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };
const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const mount = async () => render(<SafeAreaProvider initialMetrics={metrics}><InteractionsScreen /></SafeAreaProvider>);

describe('interaction check helpers', () => {
  it('adds trimmed names once, ignoring case, and never more than 20', () => {
    expect(addDrug([], '  Warfarin ')).toEqual(['Warfarin']);
    expect(addDrug(['Warfarin'], 'warfarin')).toEqual(['Warfarin']);
    expect(addDrug([], 'a')).toEqual([]);
    expect(addDrug(Array.from({ length: 20 }, (_, i) => `drug${i}`), 'extra')).toHaveLength(20);
  });
  it('names only the three levels', () => {
    expect(ixLevel('Major')?.tone).toBe('danger');
    expect(ixLevel('moderate')?.tone).toBe('warning');
    expect(ixLevel('minor')?.tone).toBe('success');
    expect(ixLevel('weird')).toBeNull();
  });
});

describe('typed interaction check screen', () => {
  beforeEach(() => apiFetch.mockReset());

  it('posts the whole list once and draws the translated verdict', async () => {
    apiFetch.mockResolvedValue({ checked: 2, safe: false, interactions: [{ severity: 'high', code: 'bleeding_risk' }] });
    await mount();
    for (const name of ['Warfarin', 'Aspirin']) {
      await fireEvent.changeText(screen.getByTestId('ix-input'), name);
      await fireEvent.press(screen.getByTestId('ix-add'));
    }
    await fireEvent.press(screen.getByTestId('ix-check'));
    await waitFor(() => expect(screen.getByText(k('pharmacy.scan.ixAttention'))).toBeTruthy());
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith('/ai/drug-interactions', { method: 'POST', body: JSON.stringify({ drugs: ['Warfarin', 'Aspirin'] }) });
    expect(screen.getByText(k('pharmacy.scan.ix.bleeding_risk'))).toBeTruthy();
    expect(screen.getByText(k('pharmacy.scan.ixHigh'))).toBeTruthy();
  });

  it('shows a real error when the check fails', async () => {
    apiFetch.mockRejectedValue(new Error('x'));
    await mount();
    await fireEvent.changeText(screen.getByTestId('ix-input'), 'Warfarin');
    await fireEvent.press(screen.getByTestId('ix-add'));
    await fireEvent.press(screen.getByTestId('ix-check'));
    await waitFor(() => expect(screen.getByText(k('pharmacy.scan.ixFailed'))).toBeTruthy());
  });
});
