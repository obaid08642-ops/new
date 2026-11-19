import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MaternitySetupView } from '../../components/care/MaternityViews';
import { isAfterToday, maternityDateProblem, parseIsoDay } from '../../utils/maternityDates';
import { message } from '../../components/screen/ScreenKit';

/** Reconciliation row 90: the LMP and due date are typed as text; the server accepts anything JavaScript can parse. All values are TEST values. */
const mockApiFetch = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: (...a: unknown[]) => mockReplace(...a), back: jest.fn(), canGoBack: jest.fn(() => true) } }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));

const k = (key: string) => message('en', key);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
beforeEach(() => { mockApiFetch.mockReset(); mockReplace.mockReset(); });

describe('maternityDates', () => {
  it('accepts only a real calendar day in year-month-day form', () => {
    expect(parseIsoDay('2026-09-20')).toBe('2026-09-20');
    expect(parseIsoDay(' 2026-09-20 ')).toBe('2026-09-20');
    expect(parseIsoDay('2024-02-29')).toBe('2024-02-29');
    for (const bad of ['', '1', 'Sept 20', '20-09-2026', '2026/09/20', '2026-9-2', '2026-02-30', '2026-13-01', '2025-02-29']) expect(parseIsoDay(bad)).toBeNull();
  });

  it('compares with today by calendar day', () => {
    const now = new Date(2026, 8, 20, 10, 0, 0);
    expect(isAfterToday('2026-09-20', now)).toBe(false);
    expect(isAfterToday('2026-09-21', now)).toBe(true);
    expect(isAfterToday('2026-09-19', now)).toBe(false);
  });

  it('names the first problem: not a day, last period in the future, bad optional due date', () => {
    const now = new Date(2026, 8, 20, 10, 0, 0);
    expect(maternityDateProblem('soon', '', now)).toBe('invalid');
    expect(maternityDateProblem('2026-10-01', '', now)).toBe('lmpFuture');
    expect(maternityDateProblem('2026-08-01', 'later', now)).toBe('invalid');
    expect(maternityDateProblem('2026-08-01', '', now)).toBeNull();
    expect(maternityDateProblem('2026-08-01', '2027-05-08', now)).toBeNull();
  });
});

describe('maternity setup', () => {
  it('shows the date message and sends nothing for a date that is not a real day', async () => {
    await render(wrap(<MaternitySetupView />));
    await act(async () => { fireEvent.changeText(screen.getByTestId('maternity-lmp'), 'Sept 20'); });
    await act(async () => { fireEvent.changeText(screen.getByTestId('maternity-cycle'), '28'); });
    await act(async () => { fireEvent.press(screen.getByTestId('maternity-save')); });
    expect(await screen.findByText(k('care.mat.dateInvalid'))).toBeTruthy();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('refuses a last period in the future', async () => {
    await render(wrap(<MaternitySetupView />));
    await act(async () => { fireEvent.changeText(screen.getByTestId('maternity-lmp'), '2999-01-01'); });
    await act(async () => { fireEvent.changeText(screen.getByTestId('maternity-cycle'), '28'); });
    await act(async () => { fireEvent.press(screen.getByTestId('maternity-save')); });
    expect(await screen.findByText(k('care.mat.lmpFuture'))).toBeTruthy();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('saves a real past day', async () => {
    mockApiFetch.mockResolvedValue({});
    await render(wrap(<MaternitySetupView />));
    await act(async () => { fireEvent.changeText(screen.getByTestId('maternity-lmp'), '2026-01-05'); });
    await act(async () => { fireEvent.changeText(screen.getByTestId('maternity-cycle'), '28'); });
    await act(async () => { fireEvent.press(screen.getByTestId('maternity-save')); });
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(mockApiFetch.mock.calls[0][1].body)).toMatchObject({ is_pregnant: false, last_period_date: '2026-01-05', cycle_length: 28 });
  });
});
