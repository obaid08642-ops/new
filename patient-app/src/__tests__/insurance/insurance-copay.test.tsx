import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import InsuranceCopayScreen from '../../../app/insurance/copay';
import { message } from '../../components/screen/ScreenKit';

/**
 * Batch 7, owner decision 35: the co-pay screen shows the facility's record of the insurer's decision: the approval number
 * and the percent only when GET /insurance/requests/my carries them (never from a route param, never invented), with the
 * server's amount. Every value is a TEST value.
 */

const mockApiFetch = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() }, useLocalSearchParams: () => ({}) }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));

const k = (key: string) => message('en', key);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

beforeEach(() => mockApiFetch.mockReset());

describe('InsuranceCopayScreen', () => {
  it('shows the approval number, the percent and the amount the provider recorded', async () => {
    mockApiFetch.mockResolvedValue([{ id: 'r1', state: 'COPAY_PENDING', copay_amount: 30, copay_percent: 15, approval_code: 'TEST-AP-501', createdAt: '2026-10-01T00:00:00Z' }]);
    await render(wrap(<InsuranceCopayScreen />));
    expect(await screen.findByText('TEST-AP-501')).toBeTruthy();
    expect(screen.getByText(k('insurance.request.approvalNumber'))).toBeTruthy();
    expect(screen.getByText('15%')).toBeTruthy();
    expect(screen.getByText('30.00 SAR')).toBeTruthy();
  });

  it('draws no approval number and no percent row when the record has none', async () => {
    mockApiFetch.mockResolvedValue([{ id: 'r1', state: 'COPAY_PENDING', copay_amount: 30, approval_code: null, createdAt: '2026-10-01T00:00:00Z' }]);
    await render(wrap(<InsuranceCopayScreen />));
    expect(await screen.findByTestId('copay-amount')).toBeTruthy();
    expect(screen.queryByText(k('insurance.request.approvalNumber'))).toBeNull();
    expect(screen.queryByText(k('insurance.request.copayPercent'))).toBeNull();
    expect(screen.getByText('30.00 SAR')).toBeTruthy();
  });

  it('issue 820: pays as the request page does: the server capabilities first, then the card intent', async () => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === '/insurance/requests/my') return [{ id: 'r1', state: 'COPAY_PENDING', copay_amount: 30, createdAt: '2026-10-01T00:00:00Z' }];
      if (path === '/insurance/requests/r1/capabilities') return { methods: [{ id: 'card' }] };
      if (path === '/payments/intent/insurance/r1') return { id: 'txn-1', checkout_url: 'https://checkout.example.test/1', amount: 30 };
      return null;
    });
    await render(wrap(<InsuranceCopayScreen />));
    await act(async () => { fireEvent.press(await screen.findByTestId('copay-pay')); });
    const calls = mockApiFetch.mock.calls.map((c) => c[0]);
    expect(calls).toEqual(['/insurance/requests/my', '/insurance/requests/r1/capabilities', '/payments/intent/insurance/r1']);
    expect(JSON.parse(mockApiFetch.mock.calls[2][1].body)).toEqual({ method: 'card' });
  });

  it('issue 820: no card intent when the server does not open the card for this request', async () => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === '/insurance/requests/my') return [{ id: 'r1', state: 'COPAY_PENDING', copay_amount: 30, createdAt: '2026-10-01T00:00:00Z' }];
      if (path === '/insurance/requests/r1/capabilities') return { methods: [] };
      return null;
    });
    await render(wrap(<InsuranceCopayScreen />));
    await act(async () => { fireEvent.press(await screen.findByTestId('copay-pay')); });
    expect(mockApiFetch.mock.calls.map((c) => c[0])).not.toContain('/payments/intent/insurance/r1');
    expect(await screen.findByTestId('copay-error')).toBeTruthy();
  });
});
