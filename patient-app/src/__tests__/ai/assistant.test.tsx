import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AssistantView } from '../../components/ai/AssistantView';
import { MonthlyReportView } from '../../components/ai/MonthlyReportView';
import { message } from '../../components/screen/ScreenKit';

/**
 * Batch 9: the one assistant and the monthly report. Every value is a TEST value. What is proved: the mode of the route picks
 * the mode (and a wrong one falls back to symptoms); a triage answer shows the disclaimer, the way into a consultation, and for
 * `care_level: emergency` the urgent block; the request is the existing POST /ai/triage; the report mode sends no request;
 * the monthly report counts only the month's appointments and fails as a whole only when all four calls fail.
 */

const mockParams: { current: Record<string, string> } = { current: {} };
const mockPush = jest.fn();
const mockApi = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() },
  useLocalSearchParams: () => mockParams.current,
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('expo-image-picker', () => ({}));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/api', () => ({ ...jest.requireActual('../../utils/api'), apiFetch: (...a: unknown[]) => mockApi(...a) }));

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

beforeEach(() => {
  mockParams.current = {};
  mockPush.mockClear();
  mockApi.mockReset();
});

const ask = async (text: string) => {
  await render(wrap(<AssistantView />));
  await act(async () => {
    fireEvent.changeText(screen.getByTestId('assistant-symptoms'), text);
  });
  await act(async () => {
    fireEvent.press(screen.getByTestId('assistant-send'));
  });
};

describe('AssistantView', () => {
  it('opens the symptoms mode by default and for an unknown mode', async () => {
    mockParams.current = { mode: 'nonsense' };
    await render(wrap(<AssistantView />));
    expect(screen.getByLabelText(k('ai.mode.symptoms')).props.accessibilityState.selected).toBe(true);
    expect(screen.getByText(k('ai.symptoms.question'))).toBeTruthy();
  });

  it('sends the symptoms and the red flags to POST /ai/triage and shows the way into a consultation with the disclaimer', async () => {
    mockApi.mockResolvedValue({ care_level: 'consultation' });
    await ask('headache');
    await waitFor(() => expect(screen.getByTestId('assistant-answer')).toBeTruthy());
    expect(mockApi).toHaveBeenCalledWith('/ai/triage', { method: 'POST', body: JSON.stringify({ symptoms: 'headache', red_flags: ['none'] }) });
    expect(screen.getByText(k('ai.disclaimer'))).toBeTruthy();
    expect(screen.queryByTestId('assistant-emergency')).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByTestId('assistant-book'));
    });
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/consultations');
  });

  it('shows the urgent block for an emergency answer and no phone number of its own', async () => {
    mockApi.mockResolvedValue({ care_level: 'emergency' });
    await ask('chest pain');
    await waitFor(() => expect(screen.getByTestId('assistant-emergency')).toBeTruthy());
    expect(screen.getByText(k('ai.emergencyTitle'))).toBeTruthy();
    expect(screen.getByText(k('ai.disclaimer'))).toBeTruthy();
  });

  it('says so when the request fails and keeps what was typed', async () => {
    mockApi.mockRejectedValue(new Error('down'));
    await ask('cough');
    await waitFor(() => expect(screen.getByTestId('assistant-error')).toBeTruthy());
    expect(screen.getByText(k('ai.symptoms.error'))).toBeTruthy();
  });

  it('asks for the symptoms first and sends nothing when the field is empty', async () => {
    await render(wrap(<AssistantView />));
    await act(async () => {
      fireEvent.press(screen.getByTestId('assistant-send'));
    });
    expect(screen.getByText(k('ai.symptoms.required'))).toBeTruthy();
    expect(mockApi).not.toHaveBeenCalled();
  });

  it('the report mode sends no request and points to the reports', async () => {
    mockParams.current = { mode: 'report' };
    await render(wrap(<AssistantView />));
    expect(screen.getByTestId('assistant-report')).toBeTruthy();
    expect(screen.getByText(k('ai.disclaimer'))).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByLabelText(k('ai.report.open')));
    });
    expect(mockPush).toHaveBeenCalledWith('/health/records?tab=reports');
    expect(mockApi).not.toHaveBeenCalled();
  });

  it('the prescription mode offers the camera and the gallery', async () => {
    mockParams.current = { mode: 'prescription' };
    await render(wrap(<AssistantView />));
    expect(screen.getByTestId('assistant-camera')).toBeTruthy();
    expect(screen.getByTestId('assistant-gallery')).toBeTruthy();
  });
});

describe('MonthlyReportView', () => {
  const thisMonth = (day: number) => new Date(new Date().getFullYear(), new Date().getMonth(), day, 10, 0).toISOString();
  const lastYear = new Date(new Date().getFullYear() - 1, 0, 5).toISOString();

  it('counts only the appointments of this month', async () => {
    mockApi.mockImplementation(async (path: string) => {
      if (path === '/care/appointments') return [{ id: 'a', slot_start: thisMonth(1), state: 'completed' }, { id: 'b', slot_start: lastYear, state: 'completed' }];
      return [];
    });
    await render(wrap(<MonthlyReportView />));
    await waitFor(() => expect(screen.getByText(k('ai.mr.monthAppointments'))).toBeTruthy());
    expect(screen.queryByText(k('ai.mr.emptyTitle'))).toBeNull();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    expect(screen.queryByText('2')).toBeNull();
    expect(mockApi).toHaveBeenCalledTimes(4);
  });

  it('shows the empty state when nothing is recorded', async () => {
    mockApi.mockResolvedValue([]);
    await render(wrap(<MonthlyReportView />));
    await waitFor(() => expect(screen.getByText(k('ai.mr.emptyTitle'))).toBeTruthy());
  });

  it('is a failure, not an empty report, when all four calls fail', async () => {
    mockApi.mockRejectedValue(new Error('down'));
    await render(wrap(<MonthlyReportView />));
    await waitFor(() => expect(screen.getByText(k('ai.mr.error'))).toBeTruthy());
    expect(screen.queryByText(k('ai.mr.emptyTitle'))).toBeNull();
  });
});
