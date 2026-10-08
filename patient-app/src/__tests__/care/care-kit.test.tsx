import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CareBar, CareHero, ChoiceTile, FormCard, localDateKey, numberOrUndefined } from '../../components/care/CareKit';
import { MaternityHubView, cycleEstimate } from '../../components/care/MaternityViews';
import { NutritionHubView } from '../../components/care/NutritionViews';
import { ProgramsActiveView } from '../../components/care/ProgramsView';
import { message } from '../../components/screen/ScreenKit';

/**
 * Batch 8: the shared care pieces and the hubs built on them. Every value is a TEST value. What is proved: the hero draws
 * its ring text, title and lines; the bar and the tile expose their state; the form card numbers its step; the maternity
 * hub shows the setup call when there is no profile, the pregnancy hero with the week from the profile, the cycle rows
 * on the Ovulation tab and the estimate maths; the nutrition Today tab reads the day's summary and meals and the water
 * button posts; the programs screen draws a program and marks a session through the confirm sheet.
 */

const mockApiFetch = jest.fn();
const mockParams: { tab?: string } = {};
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() }, useLocalSearchParams: () => mockParams }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

beforeEach(() => {
  mockApiFetch.mockReset();
  delete mockParams.tab;
});

describe('care pieces', () => {
  it('draws the hero ring text, the title and the lines', async () => {
    await render(wrap(<CareHero tone="pink" ring={{ value: 0.5, label: 'Week 20 of 40', valueText: '20', caption: 'Week' }} title="Second trimester" lines={['Due on a test date']} />));
    expect(screen.getByText('20')).toBeTruthy();
    expect(screen.getByText('Second trimester')).toBeTruthy();
    expect(screen.getByText('Due on a test date')).toBeTruthy();
  });

  it('exposes the bar value and the selected state of a tile', async () => {
    const onPress = jest.fn();
    await render(wrap(<><CareBar value={0.4} tone="blue" label="Water" testID="bar" /><ChoiceTile label="Good" selected tone="mint" onPress={onPress} testID="tile" /></>));
    expect(screen.getByTestId('bar').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 40 });
    expect(screen.getByTestId('tile').props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(screen.getByTestId('tile'));
    expect(onPress).toHaveBeenCalled();
  });

  it('numbers the step of a form card and reads optional numbers', async () => {
    await render(wrap(<FormCard step={2} title="Details"><></></FormCard>));
    expect(screen.getByText('2', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Details')).toBeTruthy();
    expect(numberOrUndefined('')).toBeUndefined();
    expect(numberOrUndefined('12.5')).toBe(12.5);
    expect(Number.isNaN(numberOrUndefined('x'))).toBe(true);
    expect(localDateKey(new Date(2026, 9, 8, 12))).toBe('2026-10-08');
  });
});

describe('maternity hub', () => {
  it('asks for the setup when there is no profile', async () => {
    mockApiFetch.mockResolvedValue({ profile_ready: false });
    await render(wrap(<MaternityHubView />));
    expect(await screen.findByText(k('care.mat.openSetup'))).toBeTruthy();
  });

  it('draws the pregnancy hero with the week of the profile', async () => {
    mockApiFetch.mockResolvedValue({ profile_ready: true, is_pregnant: true, current_week: 22, due_date: '2027-01-15' });
    await render(wrap(<MaternityHubView />));
    expect(await screen.findByText(k('care.mat.trimester2'))).toBeTruthy();
    expect(screen.getByText('22')).toBeTruthy();
    expect(screen.getByTestId('maternity-tabs-ovulation')).toBeTruthy();
  });

  it('draws the cycle rows on the Ovulation tab', async () => {
    mockParams.tab = 'ovulation';
    mockApiFetch.mockResolvedValue({ profile_ready: true, is_pregnant: false, last_period_date: '2026-09-20', cycle_length: 28, is_regular: true });
    await render(wrap(<MaternityHubView />));
    expect(await screen.findByText(k('care.mat.estimatedOvulation'))).toBeTruthy();
    expect(screen.getByText(k('care.mat.fertileWindow'))).toBeTruthy();
    expect(screen.getByText(k('care.mat.nextPeriod'))).toBeTruthy();
  });

  it('estimates ovulation 14 days before the next period and the fertile window around it', () => {
    const e = cycleEstimate({ last_period_date: '2026-09-01T00:00:00.000Z', cycle_length: 30, is_pregnant: false });
    expect(e).not.toBeNull();
    const day = (d: Date) => Math.round((d.getTime() - new Date('2026-09-01T00:00:00.000Z').getTime()) / 86_400_000);
    expect(day(e!.ovulation)).toBe(16);
    expect(day(e!.start)).toBe(11);
    expect(day(e!.end)).toBe(17);
    expect(day(e!.next)).toBe(30);
    expect(cycleEstimate({ is_pregnant: true, last_period_date: '2026-09-01', cycle_length: 28 })).toBeNull();
  });
});

describe('nutrition today tab', () => {
  const summary = { calories: { consumed: 800, target: 2000 }, macros: { protein_g: 40, carbs_g: 90, fat_g: 20 }, water: { consumed_ml: 500, target_ml: 2000 }, meals_count: 1 };
  const route = (url: string, init?: { method?: string }) => {
    if (url.startsWith('/nutrition/daily-summary')) return Promise.resolve(summary);
    if (url.startsWith('/nutrition/meals')) return Promise.resolve([{ id: 'm1', name: 'Test soup', calories: 300, meal_type: 'lunch' }]);
    if (url === '/nutrition/water' && init?.method === 'POST') return Promise.resolve({});
    return Promise.reject(new Error(`unexpected ${url}`));
  };

  it('reads the summary and the meals of the day and posts water', async () => {
    mockApiFetch.mockImplementation(route);
    await render(wrap(<NutritionHubView />));
    expect(await screen.findByText('Test soup')).toBeTruthy();
    expect(screen.getByText('800 / 2,000 kcal')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('nutrition-water-250'));
    });
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/nutrition/water', { method: 'POST', body: JSON.stringify({ amount_ml: 250 }) }));
  });
});

describe('programs', () => {
  const program = { id: 'diabetes', title: 'Test program', duration: '8 weeks', completedSessions: 1, totalSessions: 4, nextSessionTitle: 'Test visit', milestoneReward: 'Test reward', sessionsList: [{ id: 1, title: 'Done session', status: 'completed' }, { id: 2, title: 'Open session', status: 'pending' }] };

  it('draws a program and marks a session through the confirm sheet', async () => {
    mockApiFetch.mockImplementation((url: string) => (url === '/medical/programs/active' ? Promise.resolve([program]) : Promise.resolve([{ ...program, completedSessions: 2 }])));
    await render(wrap(<ProgramsActiveView />));
    expect((await screen.findAllByText('Test program')).length).toBeGreaterThan(0);
    fireEvent.press(screen.getByTestId('programs-session-2'));
    await act(async () => {
      fireEvent.press(await screen.findByTestId('programs-confirm'));
    });
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/medical/programs/complete-session', { method: 'POST', body: JSON.stringify({ programType: 'diabetes', sessionId: '2' }) }));
  });
});
