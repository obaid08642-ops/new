import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DiagnosticsCheckoutScreen from '../../../app/diagnostics/checkout';
import { message } from '../../components/screen/ScreenKit';

/**
 * Batch 3, slice 3-app (booking, restyle only): the labs and radiology checkout. TEST values. What is proved: the screen shows the
 * chosen lab, the day, time and method choices and the cart total; confirming without a time stops with the shared message and
 * makes no booking call; choosing insurance goes to the upload screen with the lab and the slot instead of booking.
 */

const mockPush = jest.fn();
const mockApi = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({ serviceType: 'home', labId: 'lab-1', labName: 'Test lab' }),
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../context/DiagnosticsCartContext', () => ({
  useDiagnosticsCart: () => ({ items: [{ id: 't1', name: 'Test one', price: 90, qty: 1, kind: 'lab' }], total: 90, clearCart: jest.fn() }),
}));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApi(...a), BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test' }));

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

describe('DiagnosticsCheckoutScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockApi.mockClear();
  });

  it('shows the lab, the total and the choices', async () => {
    await render(wrap(<DiagnosticsCheckoutScreen />));
    expect(screen.getByText('Test lab')).toBeTruthy();
    expect(screen.getByText(k('diag.checkout.day'))).toBeTruthy();
    expect(screen.getByText(k('diag.checkout.time'))).toBeTruthy();
    expect(screen.getByText(k('diag.pay.card'))).toBeTruthy();
    expect(screen.getByText(/90\.00/)).toBeTruthy();
  });

  it('asks for a time before booking and calls nothing', async () => {
    await render(wrap(<DiagnosticsCheckoutScreen />));
    await act(async () => {
      fireEvent.press(screen.getByLabelText(k('diag.checkout.confirm')));
    });
    expect(screen.getByText(k('diag.checkout.pickTime'))).toBeTruthy();
    expect(mockApi).not.toHaveBeenCalled();
  });

  it('sends insurance to the upload screen with the lab and the slot, and books nothing', async () => {
    await render(wrap(<DiagnosticsCheckoutScreen />));
    await act(async () => {
      fireEvent.press(screen.getByText(k('diag.pay.insurance')));
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText('09:00 AM'));
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText(k('diag.checkout.toInsurance')));
    });
    expect(mockApi).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/diagnostics/insurance-approval', params: expect.objectContaining({ labId: 'lab-1', labName: 'Test lab', serviceType: 'home', time: '09:00' }) }));
  });
});
