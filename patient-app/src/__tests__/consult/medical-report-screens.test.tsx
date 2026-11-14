import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import MedicalReportsScreen from '../../../app/medical-reports/index';
import MedicalReportScreen from '../../../app/medical-reports/[id]';
import { message } from '../../components/screen/ScreenKit';

/** PT-08: the medical reports screens: list, detail with the Seha state and the footer, the PDF shared, never called "sick leave". TEST values only. */
const mockApiFetch = jest.fn();
const mockDownload = jest.fn();
const mockShare = jest.fn();
const mockParams: { current: Record<string, string | undefined> } = { current: {} };
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams.current,
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), downloadProtected: (...a: unknown[]) => mockDownload(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../../utils/shareFile', () => ({ shareFile: (...a: unknown[]) => mockShare(...a) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const tap = async (el: Parameters<typeof fireEvent.press>[0]) => { await act(async () => { fireEvent.press(el); }); };

beforeEach(() => {
  mockApiFetch.mockReset();
  mockDownload.mockReset();
  mockShare.mockReset();
  mockPush.mockReset();
  mockParams.current = { id: 'rep-test-0001' };
});

describe('medical reports', () => {
  it('lists the reports with the period and the Seha state, and opens one', async () => {
    mockApiFetch.mockResolvedValue([{ id: 'rep-test-0001', serial: 'MED-2026-000001', status: 'issued', from: '2026-11-10', to: '2026-11-12', days: 3, doctor_name: 'Dr Test', seha_status: 'pending' }, { id: 'rep-test-0002', serial: 'MED-2026-000002', status: 'revoked' }]);
    await render(wrap(<MedicalReportsScreen />));
    await screen.findByText('MED-2026-000001');
    expect(mockApiFetch).toHaveBeenCalledWith('/care/sick-leaves');
    expect(screen.getByText(new RegExp(k('medreport.sehaPending')))).toBeTruthy();
    expect(screen.getByText(new RegExp(k('medreport.revoked')))).toBeTruthy();
    await tap(screen.getByTestId('medical-report-rep-test-0001'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/medical-reports/[id]', params: { id: 'rep-test-0001' } });
  });

  it('an empty list says so; a failed read shows the error with a retry', async () => {
    mockApiFetch.mockResolvedValue([]);
    await render(wrap(<MedicalReportsScreen />));
    await screen.findByText(k('medreport.listEmpty'));
    mockApiFetch.mockReset();
    mockApiFetch.mockRejectedValueOnce(new Error('OFFLINE')).mockResolvedValue([{ id: 'rep-test-0001', serial: 'MED-2026-000001' }]);
    await render(wrap(<MedicalReportsScreen />));
    await screen.findByText(k('medreport.loadError'));
    await tap(screen.getByText(k('common.retry')));
    await screen.findByText('MED-2026-000001');
  });

  it('shows one report in full with the Seha state and the footer, and shares the PDF through the protected download', async () => {
    mockApiFetch.mockResolvedValue({ id: 'rep-test-0001', serial: 'MED-2026-000001', status: 'issued', issued_at: '2026-11-09T10:00:00Z', from: '2026-11-10', to: '2026-11-12', days: 3, doctor_name: 'Dr Test', doctor_specialty_en: 'Cardiology', doctor_license_no: 'SCFHS-1', patient_name: 'Test Patient', national_id: '1234567890', consultation_at: '2026-11-09T09:00:00Z', booking_ref: 'BK-1', reason: 'Needs rest', diagnosis: null, seha_status: 'pending' });
    mockDownload.mockResolvedValue('file:///tmp/medical-report.pdf');
    await render(wrap(<MedicalReportScreen />));
    await screen.findByText('Dr Test');
    for (const text of ['Cardiology', 'SCFHS-1', 'Test Patient', '1234567890', 'BK-1', 'Needs rest', k('medreport.sehaPending'), k('medreport.footer')]) expect(screen.getByText(text)).toBeTruthy();
    expect(screen.queryByText(k('medreport.diagnosis'))).toBeNull();
    // the only place "sick leave" appears is the owner's Seha footer
    expect(screen.queryAllByText(/sick leave/i).map((n) => n.props.children)).toEqual([k('medreport.footer')]);
    await tap(screen.getByTestId('medical-report-pdf'));
    await waitFor(() => expect(mockShare).toHaveBeenCalledWith('file:///tmp/medical-report.pdf', 'application/pdf', k('medreport.detailTitle')));
    expect(mockDownload).toHaveBeenCalledWith('/care/sick-leaves/rep-test-0001/pdf', 'medical-report-MED-2026-000001.pdf');
  });

  it('a registered report shows the Seha number; a revoked one the reason; a refused PDF says so', async () => {
    mockApiFetch.mockResolvedValue({ id: 'rep-test-0001', serial: 'MED-2026-000003', status: 'revoked', revoke_reason: 'Issued by mistake', seha_status: 'registered', seha_number: 'SEHA-77' });
    mockDownload.mockResolvedValue(null);
    await render(wrap(<MedicalReportScreen />));
    await screen.findByText(k('medreport.sehaRegistered', { number: 'SEHA-77' }));
    expect(screen.getByText(`${k('medreport.revoked')}: Issued by mistake`)).toBeTruthy();
    await tap(screen.getByTestId('medical-report-pdf'));
    await screen.findByText(k('medreport.pdfError'));
    expect(mockShare).not.toHaveBeenCalled();
  });

  it('an address with no usable id calls nothing and shows the error', async () => {
    mockParams.current = { id: '../x' };
    await render(wrap(<MedicalReportScreen />));
    await screen.findByText(k('medreport.loadError'));
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});
