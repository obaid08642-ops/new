import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import OrderDetails from '../../../app/diagnostics/order/[id]';
import { ResultsPanel } from '../../components/orders/ResultsPanel';
import { message } from '../../components/screen/ScreenKit';

/**
 * PT-09: lab and radiology reports viewed and downloaded. TEST payloads. What is proved: the PDF action exists only for a lab
 * booking's report file; it downloads through the protected report API (never a raw url), then shares the file as a PDF; a
 * refused download says there is no report and shares nothing; a share sheet that throws does not crash the screen; a
 * radiology result has no PDF action and opens its order; the booking screen's PDF action does the same for lab, opens the
 * report view for a radiology report, and says "no report" when there is none.
 */
const mockParams: { current: Record<string, string> } = { current: { id: 'lb1' } };
const mockShare = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams.current,
}));
jest.mock('../../utils/shareFile', () => ({ shareFile: (...a: unknown[]) => mockShare(...a) }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn(), downloadProtected: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRouter = (require('expo-router') as { router: Record<'push' | 'replace', jest.Mock> }).router;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch, downloadProtected } = require('../../utils/api') as { apiFetch: jest.Mock; downloadProtected: jest.Mock };

const k = (key: string) => message('en', key);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const tap = async (el: Parameters<typeof fireEvent.press>[0]) => { await act(async () => { fireEvent.press(el); }); };
const answer = (map: Record<string, unknown>) => apiFetch.mockImplementation(async (path: string) => {
  if (!(path in map)) throw new Error(`no answer for ${path}`);
  const v = map[path];
  if (v instanceof Error) throw v;
  return v;
});

let alertSpy: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  mockParams.current = { id: 'lb1' };
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

const labs = [
  { id: 'lr1', booking_id: 'lb1', service_name_en: 'Test lab result', source: 'lab_booking', reported_at: '2026-10-02T10:00:00Z', viewed_by_patient: true },
  { id: 'lr2', booking_id: 'lb2', service_name_en: 'Test lab without file', reported_at: '2026-10-01T10:00:00Z', viewed_by_patient: true },
];
const rads = [{ id: 'rb1', items: [{ name_en: 'Test scan' }], updatedAt: '2026-10-03T10:00:00Z' }];

describe('results panel PDF', () => {
  const open = async () => {
    answer({ '/lab-results/mine': labs, '/radiology/reports/mine': rads });
    await render(wrap(<ResultsPanel testID="rp" />));
    await screen.findByText('Test lab result');
  };

  it('only the lab report file has a PDF action', async () => {
    await open();
    expect(screen.queryByTestId('rp-lab-lr1-pdf')).toBeTruthy();
    expect(screen.queryByTestId('rp-lab-lr2-pdf')).toBeNull();
    expect(screen.queryByTestId('rp-rad-rb1-pdf')).toBeNull();
  });

  it('downloads through the protected report API and shares the file as a PDF', async () => {
    downloadProtected.mockResolvedValue('file:///cache/lab-report-lr1.pdf');
    await open();
    await tap(screen.getByTestId('rp-lab-lr1-pdf'));
    expect(downloadProtected).toHaveBeenCalledWith('/labs/bookings/lb1/reports/lr1', 'lab-report-lr1.pdf');
    await waitFor(() => expect(mockShare).toHaveBeenCalledWith('file:///cache/lab-report-lr1.pdf', 'application/pdf', k('diag.order.pdf')));
  });

  it('a refused download says there is no report and shares nothing', async () => {
    downloadProtected.mockResolvedValue(null);
    await open();
    await tap(screen.getByTestId('rp-lab-lr1-pdf'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(alertSpy.mock.calls[0][0]).toBe(k('diag.order.noReportTitle'));
    expect(mockShare).not.toHaveBeenCalled();
  });

  it('a radiology result opens its order', async () => {
    await open();
    await tap(screen.getByTestId('rp-rad-rb1-view'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/diagnostics/order/[id]', params: { id: 'rb1' } });
  });
});

describe('booking screen report action', () => {
  const labBooking = (extra: Record<string, unknown> = {}) => ({ id: 'lb1', state: 'RESULT_UPLOADED', results: [], reports: [{ id: 'rep1', has_file: true, mime: 'application/pdf' }], ...extra });

  it('lab: downloads the report file and shares it', async () => {
    downloadProtected.mockResolvedValue('file:///cache/lab-report-rep1.pdf');
    answer({ '/radiology/bookings/lb1': new Error('not radiology'), '/labs/bookings/lb1': labBooking() });
    await render(wrap(<OrderDetails />));
    await tap(await screen.findByLabelText(k('diag.order.pdf')));
    expect(downloadProtected).toHaveBeenCalledWith('/labs/bookings/lb1/reports/rep1', 'lab-report-rep1.pdf');
    await waitFor(() => expect(mockShare).toHaveBeenCalledWith('file:///cache/lab-report-rep1.pdf', 'application/pdf', k('diag.order.pdf')));
  });

  it('lab: no report file means the no-report message', async () => {
    answer({ '/radiology/bookings/lb1': new Error('not radiology'), '/labs/bookings/lb1': labBooking({ reports: [] }) });
    await render(wrap(<OrderDetails />));
    await tap(await screen.findByLabelText(k('diag.order.pdf')));
    expect(alertSpy.mock.calls[0][0]).toBe(k('diag.order.noReportTitle'));
    expect(downloadProtected).not.toHaveBeenCalled();
  });

  it('lab: a refused download means the no-report message', async () => {
    downloadProtected.mockResolvedValue(null);
    answer({ '/radiology/bookings/lb1': new Error('not radiology'), '/labs/bookings/lb1': labBooking() });
    await render(wrap(<OrderDetails />));
    await tap(await screen.findByLabelText(k('diag.order.pdf')));
    expect(alertSpy.mock.calls[0][0]).toBe(k('diag.order.noReportTitle'));
    expect(mockShare).not.toHaveBeenCalled();
  });

  it('radiology: opens the report view by its id, and says so when the booking has none', async () => {
    mockParams.current = { id: 'rb1' };
    answer({ '/radiology/bookings/rb1': { id: 'rb1', state: 'REPORT_READY', report_id: 'rr1' } });
    await render(wrap(<OrderDetails />));
    await tap(await screen.findByLabelText(k('diag.order.pdf')));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/reports/view-report', params: { id: 'rr1' } });
    expect(downloadProtected).not.toHaveBeenCalled();
  });

  it('radiology without a report id says there is no report', async () => {
    mockParams.current = { id: 'rb1' };
    answer({ '/radiology/bookings/rb1': { id: 'rb1', state: 'REPORT_READY' } });
    await render(wrap(<OrderDetails />));
    await tap(await screen.findByLabelText(k('diag.order.pdf')));
    expect(alertSpy.mock.calls[0][0]).toBe(k('diag.order.noReportTitle'));
  });
});
