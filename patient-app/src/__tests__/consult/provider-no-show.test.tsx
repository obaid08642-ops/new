import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProviderNoShow } from '../../components/consult/ProviderNoShow';
import { message } from '../../components/screen/ScreenKit';
import { canReportNoShow, noShowOpensAt } from '../../utils/providerNoShow';

/** "The doctor did not come": offered 10 minutes after the start, only for a visit that never started; a confirm step; the server's refusal is an error. TEST values only. */
const mockApiFetch = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) } }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const k = (key: string) => message('en', key);
const tap = async (el: Parameters<typeof fireEvent.press>[0]) => { await act(async () => { fireEvent.press(el); }); };
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

beforeEach(() => mockApiFetch.mockReset());

describe('the doctor did not come: when', () => {
  const START = '2026-11-09T10:00:00Z';
  const at = (m: number) => Date.parse(START) + m * 60_000;
  it('is offered 10 minutes after the start and only for a visit that never started', () => {
    expect(canReportNoShow('confirmed', START, at(9.9))).toBe(false);
    expect(canReportNoShow('CONFIRMED', START, at(10))).toBe(true);
    for (const s of ['confirmed', 'checked_in', 'en_route']) expect(canReportNoShow(s, START, at(20))).toBe(true);
    for (const s of ['in_progress', 'completed', 'cancelled', 'no_show', 'pending', 'arrived', '', undefined]) expect(canReportNoShow(s, START, at(20))).toBe(false);
    expect(canReportNoShow('confirmed', undefined, at(20))).toBe(false);
    expect(noShowOpensAt('confirmed', START)).toBe(at(10));
  });
});

describe('the doctor did not come: the button', () => {
  it('is not drawn before the 10 minutes, nor for a visit that started', async () => {
    await render(wrap(<ProviderNoShow appointmentId="appt-1" status="confirmed" slotStart={ago(5)} onDone={jest.fn()} />));
    expect(screen.queryByTestId('detail-no-show')).toBeNull();
    await render(wrap(<ProviderNoShow appointmentId="appt-1" status="in_progress" slotStart={ago(30)} onDone={jest.fn()} />));
    expect(screen.queryByTestId('detail-no-show')).toBeNull();
  });

  it('asks first (what it does), sends nothing until confirmed, then reloads', async () => {
    const onDone = jest.fn();
    mockApiFetch.mockResolvedValue({ ok: true });
    await render(wrap(<ProviderNoShow appointmentId="appt-1" status="confirmed" slotStart={ago(15)} onDone={onDone} />));
    await tap(await screen.findByTestId('detail-no-show'));
    expect(screen.getByText(k('consult.noShow.confirmBody'))).toBeTruthy();
    expect(mockApiFetch).not.toHaveBeenCalled();
    await tap(screen.getByTestId('detail-no-show-keep'));
    expect(screen.getByTestId('detail-no-show')).toBeTruthy();
    await tap(screen.getByTestId('detail-no-show'));
    await tap(screen.getByTestId('detail-no-show-confirm'));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(mockApiFetch).toHaveBeenCalledWith('/care/appointments/appt-1/provider-no-show', { method: 'POST', body: '{}' });
    expect(screen.getByText(k('consult.noShow.done'))).toBeTruthy();
  });

  it('shows the server refusal as an error, never as success', async () => {
    const onDone = jest.fn();
    mockApiFetch.mockRejectedValue(new Error('provider_no_show_too_early'));
    await render(wrap(<ProviderNoShow appointmentId="appt-1" status="confirmed" slotStart={ago(15)} onDone={onDone} />));
    await tap(await screen.findByTestId('detail-no-show'));
    await tap(screen.getByTestId('detail-no-show-confirm'));
    await screen.findByText(k('consult.noShow.error'));
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.queryByText(k('consult.noShow.done'))).toBeNull();
  });
});
