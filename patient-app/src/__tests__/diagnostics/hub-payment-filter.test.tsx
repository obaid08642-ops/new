import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DiagnosticsHub from '../../../app/(tabs)/diagnostics';
import { serveCatalog } from './catalogServer';
import { message } from '../../components/screen/ScreenKit';

/**
 * Needs-review 3-app 0 (issue 622), owner decision 2026-10-14 question 5 with decision 30: the hub asks first whether the
 * patient pays by insurance or by themselves, and the lists show only the services that take that payment
 * (`insurance_availability`, `cash_availability` of each catalogue service). TEST values.
 */

jest.setTimeout(30000);
const mockApi = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => undefined,
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
// the header carries the service cart button (owner layout decision 2), which reads the pharmacy cart count
jest.mock('../../context/CartContext', () => ({ useCart: () => ({ itemCount: 0 }) }));
jest.mock('../../context/DiagnosticsCartContext', () => ({
  useDiagnosticsCart: () => ({ items: [], itemCount: 0, total: 0, addItem: jest.fn(), removeItem: jest.fn() }),
}));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApi(...a), BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test' }));

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

const TESTS = [
  { id: 't-both', name_en: 'Test on both', price: 50, cash_availability: true, insurance_availability: true },
  { id: 't-cash', name_en: 'Test self-pay only', price: 40, cash_availability: true, insurance_availability: false },
  { id: 't-ins', name_en: 'Test insurance only', price: 60, cash_availability: false, insurance_availability: true },
];

describe('Diagnostics hub: insurance or self-pay first (decision 30)', () => {
  beforeEach(() => {
    mockApi.mockReset();
    mockApi.mockImplementation(async (path: string) => serveCatalog(path, { labs: TESTS }));
  });

  it('self-pay is the first choice and lists only what the patient can pay for', async () => {
    await render(wrap(<DiagnosticsHub />));
    await waitFor(() => expect(screen.getAllByText('Test on both').length).toBeGreaterThan(0), { timeout: 15000 });
    expect(screen.getByText(k('diag.pay.selfPay'))).toBeTruthy();
    expect(screen.getAllByText('Test self-pay only').length).toBeGreaterThan(0);
    expect(screen.queryByText('Test insurance only')).toBeNull();
  });

  it('insurance lists only the services that take insurance', async () => {
    await render(wrap(<DiagnosticsHub />));
    await waitFor(() => expect(screen.getAllByText('Test on both').length).toBeGreaterThan(0), { timeout: 15000 });
    await fireEvent.press(screen.getByText(k('diag.pay.insurance')));
    await waitFor(() => expect(screen.getAllByText('Test insurance only').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Test on both').length).toBeGreaterThan(0);
    expect(screen.queryByText('Test self-pay only')).toBeNull();
  });
});
