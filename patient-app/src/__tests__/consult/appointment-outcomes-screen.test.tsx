import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppointmentDetailScreen from '../../../app/consultations/appointment-detail';
import { message } from '../../components/screen/ScreenKit';

/** The outcome sections of a finished visit, drawn from test values shaped like the real answers; a section without data is not drawn. */
const mockParams: { current: Record<string, string | undefined> } = { current: { appointmentId: 'appt-1' } };
const mockAddItem = jest.fn(async () => ({ success: true }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams.current,
}));
jest.mock('expo-linking', () => ({ openURL: jest.fn(async () => true) }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../context/CartContext', () => ({ useCart: () => ({ addItem: jest.fn(async () => undefined) }) }));
jest.mock('../../context/DiagnosticsCartContext', () => ({ useDiagnosticsCart: () => ({ addItem: mockAddItem, items: [] }) }));
jest.mock('../../components/LocalizedAlert', () => ({ showLocalizedAlert: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn(), newIdempotencyKey: jest.fn(() => 'key-1') }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRouter = (require('expo-router') as { router: { push: jest.Mock } }).router;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };
const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

const appt = { id: 'appt-1', status: 'COMPLETED', doctor_id: 'doc-1', doctor_name: 'Test Doctor', service_type: 'video', scheduled_at: '2026-10-01T09:00:00.000Z' };
function answer(map: Record<string, unknown>) {
  apiFetch.mockImplementation(async (path: string) => {
    const key = Object.keys(map).sort((a, b) => b.length - a.length).find((p) => path.startsWith(p));
    const v = key ? map[key] : {};
    if (v instanceof Error) throw v;
    return v;
  });
}

beforeEach(() => jest.clearAllMocks());

describe('appointment outcome sections', () => {
  it('draws sick leave and reports of this visit and opens one in view-report', async () => {
    answer({
      '/care/appointments/appt-1/summary': { diagnosis: 'Test diagnosis' },
      '/care/appointments/appt-1': appt,
      '/medical-reports/mine': [
        { id: 'r1', appointment_id: 'appt-1', certificate_kind: 'sick_leave', report_type: 'medical_certificate', title_en: 'Test sick leave', sick_leave: { start_date: '2026-10-01', end_date: '2026-10-04', duration_days: 3 }, viewed_by_patient: false },
        { id: 'r2', appointment_id: 'other', report_type: 'consultation_note', title_en: 'Other visit' },
      ],
    });
    await render(wrap(<AppointmentDetailScreen />));
    const row = await screen.findByTestId('outcome-sick-leave-r1');
    expect(screen.getByText(k('consult.outcome.new'))).toBeTruthy();
    expect(screen.queryByText('Other visit')).toBeNull();
    await act(async () => {
      fireEvent.press(row);
    });
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/reports/view-report', params: { id: 'r1' } });
  });

  it('adds the referred tests to the labs cart and leaves unknown codes out', async () => {
    answer({
      '/care/appointments/appt-1/summary': { diagnosis: 'Test diagnosis', referrals: { lab_tests: ['T1', 'T2'], radiology_scans: [] } },
      '/care/appointments/appt-1': appt,
      '/medical-reports/mine': [],
      '/labs/services/T1': { id: 'T1', name_en: 'Test CBC', price: 40 },
      '/labs/services/T2': new Error('404'),
    });
    await render(wrap(<AppointmentDetailScreen />));
    const book = await screen.findByTestId('referral-book-lab');
    await act(async () => {
      fireEvent.press(book);
    });
    await waitFor(() => expect(mockAddItem).toHaveBeenCalledTimes(1));
    expect(mockAddItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'T1', kind: 'lab' }));
    expect(screen.queryByTestId('referral-book-radiology')).toBeNull();
  });

  it('draws neither section when the server has nothing', async () => {
    answer({ '/care/appointments/appt-1/summary': new Error('404 summary not available'), '/care/appointments/appt-1': appt, '/medical-reports/mine': [] });
    await render(wrap(<AppointmentDetailScreen />));
    await screen.findByTestId('appointment-detail-screen');
    await waitFor(() => expect(called('/medical-reports/mine')).toBe(true));
    expect(screen.queryByTestId('detail-outcome-reports')).toBeNull();
    expect(screen.queryByTestId('referral-book-lab')).toBeNull();
  });
});
const called = (prefix: string) => apiFetch.mock.calls.some(([p]) => String(p).startsWith(prefix));
