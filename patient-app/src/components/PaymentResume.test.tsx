import React from 'react';
import { AppState } from 'react-native';
import { act, render } from '@testing-library/react-native';
import PaymentResume from './PaymentResume';

const mockAuth: { current: { user: { id: string } | null; isAuthenticated: boolean } } = { current: { user: { id: 'u1' }, isAuthenticated: true } };
const mockPath: { current: string } = { current: '/(tabs)' };
const mockMarker: { current: unknown } = { current: null };
const mockPush = jest.fn();

jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) }, usePathname: () => mockPath.current }));
jest.mock('../store/hooks', () => ({ useAppSelector: (sel: (s: unknown) => unknown) => sel({ auth: mockAuth.current }) }));
jest.mock('../utils/paymentInFlight', () => {
  const real = jest.requireActual('../utils/paymentInFlight');
  return { ...real, readPaymentInFlight: jest.fn(async () => mockMarker.current), setPaymentAccount: jest.fn() };
});

const marker = { userId: 'u1', transactionId: 'tx-1', gatewayId: null, bookingKind: 'pharmacy', bookingId: 'ord-1', startedAt: Date.now() };

describe('15.8 reopening the app during a payment', () => {
  let appStateHandler: ((s: string) => void) | null = null;
  beforeEach(() => {
    mockPush.mockClear();
    mockPath.current = '/(tabs)';
    mockMarker.current = marker;
    mockAuth.current = { user: { id: 'u1' }, isAuthenticated: true };
    appStateHandler = null;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, h: (s: string) => void) => { appStateHandler = h; return { remove: jest.fn() }; }) as never);
  });
  afterEach(() => jest.restoreAllMocks());

  it('takes a signed-in person with a payment under way to its result screen, which asks the server', async () => {
    await act(async () => { render(<PaymentResume />); });
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/payments/result', params: { transactionId: 'tx-1', bookingKind: 'pharmacy', bookingId: 'ord-1' } });
  });

  it('does nothing without a payment under way, when signed out, or when already on the payment screens', async () => {
    mockMarker.current = null;
    await act(async () => { render(<PaymentResume />); });
    mockMarker.current = marker;
    mockAuth.current = { user: null, isAuthenticated: false };
    await act(async () => { render(<PaymentResume />); });
    mockAuth.current = { user: { id: 'u1' }, isAuthenticated: true };
    mockPath.current = '/payments/result';
    await act(async () => { render(<PaymentResume />); });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('offers it once per payment per app start: leaving the pending screen does not pull the person back', async () => {
    await act(async () => { render(<PaymentResume />); });
    expect(mockPush).toHaveBeenCalledTimes(1);
    await act(async () => { appStateHandler?.('background'); appStateHandler?.('active'); });
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('a new payment under way is offered even after an earlier one was', async () => {
    await act(async () => { render(<PaymentResume />); });
    mockMarker.current = { ...marker, transactionId: 'tx-2' };
    await act(async () => { appStateHandler?.('active'); });
    expect(mockPush).toHaveBeenCalledTimes(2);
    expect(mockPush.mock.calls[1][0].params.transactionId).toBe('tx-2');
  });
});
