import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ShareReportScreen from '../../../app/consultations/share-report';
import { parseResultKind, reportIdsForBooking } from '../../utils/shareReportPreselect';
import { message } from '../../components/screen/ScreenKit';

/** Reconciliation rows 64 and 93: "Share with your doctor" from a result ticks the medical report of that result's booking. All values are TEST values. */
const mockApiFetch = jest.fn();
const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams.current,
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const reports = [
  { id: 'r1', title_en: 'Test blood report', lab_booking_id: 'lb1' },
  { id: 'r2', title_en: 'Test scan report', radiology_booking_id: 'rb1' },
  { id: 'r3', title_en: 'Test other report', lab_booking_id: 'lb9' },
];
beforeEach(() => { mockApiFetch.mockReset(); mockApiFetch.mockResolvedValue(reports); });

describe('reportIdsForBooking', () => {
  it('matches the lab booking for a lab result and the radiology booking for a scan', () => {
    expect(reportIdsForBooking(reports, 'lab', 'lb1')).toEqual(['r1']);
    expect(reportIdsForBooking(reports, 'radiology', 'rb1')).toEqual(['r2']);
    expect(reportIdsForBooking(reports, 'radiology', 'lb1')).toEqual([]);
  });
  it('ticks nothing without a kind, a booking or a matching report', () => {
    expect(reportIdsForBooking(reports, null, 'lb1')).toEqual([]);
    expect(reportIdsForBooking(reports, 'lab', null)).toEqual([]);
    expect(reportIdsForBooking(reports, 'lab', 'nope')).toEqual([]);
    expect(parseResultKind('lab')).toBe('lab');
    expect(parseResultKind('x')).toBeNull();
  });
});

describe('share reports screen', () => {
  it('opened from a lab result, ticks that result\'s report (one selected)', async () => {
    mockParams.current = { kind: 'lab', booking: 'lb1' };
    await render(wrap(<ShareReportScreen />));
    expect(await screen.findByText('Test blood report')).toBeTruthy();
    await waitFor(() => expect(screen.getByText(k('consult.share.shareN', { n: 1 }))).toBeTruthy());
  });

  it('opened plainly, ticks nothing', async () => {
    mockParams.current = {};
    await render(wrap(<ShareReportScreen />));
    expect(await screen.findByText('Test blood report')).toBeTruthy();
    expect(screen.queryByText(k('consult.share.shareN', { n: 1 }))).toBeNull();
  });
});
