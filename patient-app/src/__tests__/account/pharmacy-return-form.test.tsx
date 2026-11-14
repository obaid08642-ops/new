import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ReturnRequestView } from '../../components/account/ReturnsViews';
import { message } from '../../components/screen/ScreenKit';

/** A pharmacy return (owner decision 4, 2026-11-10): only a defect reason, and a photo before it can be sent; the screen keeps Review off until a photo is attached (the picker itself is a dynamic import the jest setup cannot run). TEST values only. */
const mockApi = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) } }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/api', () => ({ ...jest.requireActual('../../utils/api'), apiFetch: (...a: unknown[]) => mockApi(...a) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../hooks/useUploadsEnabled', () => ({ useUploadsEnabled: () => true }));
jest.mock('expo-image-picker', () => ({}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const k = (key: string) => message('en', key);
const tap = async (el: Parameters<typeof fireEvent.press>[0]) => { await act(async () => { fireEvent.press(el); }); };
beforeEach(() => mockApi.mockReset());

const open = async (upload: unknown) => {
  mockApi.mockImplementation(async (path: string) => {
    if (path.startsWith('/pharmacy/returns/eligible/')) return [{ id: 'order-0001', amount: 20 }];
    if (path === '/media/upload') return upload;
    return { id: 'ret-1' };
  });
  await render(<SafeAreaProvider initialMetrics={metrics}><ReturnRequestView /></SafeAreaProvider>);
  await tap(screen.getByTestId('return-type-pharmacy'));
  await tap(screen.getByTestId('return-next'));
  await tap(await screen.findByLabelText(/order-00/));
};

describe('a pharmacy return', () => {
  it('offers only the four defect reasons and no other', async () => {
    await open({ id: 'm1' });
    for (const label of ['Wrong medicine', 'Damaged medicine', 'Expired medicine', 'Not as described']) expect(screen.getByLabelText(label)).toBeTruthy();
    for (const old of ['The order did not arrive', 'Missing quantities', 'Mistake in the order', 'Another reason']) expect(screen.queryByLabelText(old)).toBeNull();
  });

  it('asks for a photo and keeps Review off until one is attached, even with a reason chosen', async () => {
    await open({ id: 'm1' });
    expect(screen.getByText(k('returns.new.photoRequired'))).toBeTruthy();
    await tap(screen.getByLabelText('Damaged medicine'));
    expect(screen.getByTestId('return-review').props.accessibilityState?.disabled).toBe(true);
  });

  it('another service does not ask for a photo', async () => {
    mockApi.mockImplementation(async (path: string) => (path.startsWith('/pharmacy/returns/eligible/') ? [{ id: 'visit-0001', amount: 50 }] : []));
    await render(<SafeAreaProvider initialMetrics={metrics}><ReturnRequestView /></SafeAreaProvider>);
    await tap(screen.getByTestId('return-type-consultation'));
    await tap(screen.getByTestId('return-next'));
    await tap(await screen.findByLabelText(/visit-00/));
    expect(screen.queryByText(k('returns.new.photoRequired'))).toBeNull();
    await tap(screen.getByLabelText('Cancelled the booking'));
    expect(screen.getByTestId('return-review').props.accessibilityState?.disabled).not.toBe(true);
  });
});
