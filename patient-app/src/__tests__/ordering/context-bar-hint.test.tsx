import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ContextBar } from '../../components/ordering/ContextBar';
import { message } from '../../components/screen/ScreenKit';

/** Reconciliation row 47: the board draws no line under the context bar; the app printed "prices and coverage update..." on every screen. All values are TEST values. */
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) } }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/orderingContextPrefs', () => ({ isNewPatient: () => false, markContextSkipped: jest.fn(), readContextSkipped: jest.fn(async () => true) }));

const k = (key: string) => message('en', key);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const setMode = jest.fn();
const ctx = {
  profile: { policy: null, members: [] },
  choice: { mode: 'home', memberId: null },
  payer: 'cash',
  place: null,
  setMode, setPayer: jest.fn(), setMember: jest.fn(),
} as never;

describe('ordering context bar line', () => {
  it('shows nothing under the bar until a choice is changed, then the update line', async () => {
    await render(wrap(<ContextBar ctx={ctx} />));
    expect(screen.queryByText(k('ordering.ctx.hint'))).toBeNull();
    expect(screen.queryByText(k('ordering.ctx.toast'))).toBeNull();
    await act(async () => { fireEvent.press(screen.getByTestId('ordering-ctx-where')); });
    await act(async () => { fireEvent.press(await screen.findByText(k('ordering.ctx.optGo'))); });
    expect(setMode).toHaveBeenCalledWith('facility');
    expect(await screen.findByText(k('ordering.ctx.toast'))).toBeTruthy();
    expect(screen.queryByText(k('ordering.ctx.hint'))).toBeNull();
  });
});
