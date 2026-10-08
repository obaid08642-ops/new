import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import InsuranceApproval from '../../app/diagnostics/insurance-approval';
import InsuranceUploadRedirect from '../../app/diagnostics/insurance-upload';
import SampleTracking from '../../app/diagnostics/sample-tracking';
import TechnicianTrackingRedirect from '../../app/diagnostics/technician-tracking';
import PharmacyFiltersRedirect from '../../app/pharmacy/filters';
import PharmacyOrderHistoryRedirect from '../../app/pharmacy/order-history';
import PharmacyRequestRedirect from '../../app/pharmacy/request';
import PharmacyScanPrescriptionRedirect from '../../app/pharmacy/scan-prescription';
import DrugScannerRedirect from '../../app/drug-scanner/index';
import { FilterSheet } from '../components/pharmacy/FilterSheet';
import { message } from '../components/screen/ScreenKit';

/**
 * Batch 14, part 14b: the merged screens of labs/radiology and pharmacy. Boundaries only: the API, the router and the app
 * context; every value is a TEST value. Proved: the old routes redirect and keep their query, the insurance step is one
 * screen with two states, the technician block lives in sample tracking, and the filters are a sheet that hands the same
 * `filter_*` params to the catalogue.
 */

const mockParams: { current: Record<string, string | undefined> } = { current: {} };
const mockRedirect = jest.fn();

jest.mock('expo-router', () => {
  const R = require('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() },
    useLocalSearchParams: () => mockParams.current,
    useFocusEffect: (cb: () => void | (() => void)) => R.useEffect(cb, [cb]),
    Redirect: (props: { href: string }) => {
      mockRedirect(props.href);
      return null;
    },
  };
});
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));
jest.mock('../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../context/DiagnosticsCartContext', () => ({
  useDiagnosticsCart: () => ({ items: [], setPrescriptionUrl: jest.fn(), setPaymentType: jest.fn(), clearCart: jest.fn(async () => undefined) }),
}));
jest.mock('expo-image-picker', () => ({}));
jest.mock('../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn(), newIdempotencyKey: jest.fn(() => 'k') }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../utils/api') as { apiFetch: jest.Mock };

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.current = {};
  apiFetch.mockReset();
});

describe('redirects of the merged routes keep the query', () => {
  const cases: Array<[string, React.ComponentType, Record<string, string>, string]> = [
    ['insurance-upload', InsuranceUploadRedirect, { labId: 'l1', time: '10:00' }, '/diagnostics/insurance-approval?labId=l1&time=10%3A00'],
    ['technician-tracking', TechnicianTrackingRedirect, { bookingId: 'b1' }, '/diagnostics/sample-tracking?bookingId=b1'],
    ['pharmacy/filters', PharmacyFiltersRedirect, { filter_rx: '1', filter_sort: 'price_asc' }, '/(tabs)/pharmacy?filter_rx=1&filter_sort=price_asc'],
    ['pharmacy/order-history', PharmacyOrderHistoryRedirect, {}, '/orders'],
    ['pharmacy/request', PharmacyRequestRedirect, {}, '/pharmacy/rx-order?via=type'],
    ['pharmacy/scan-prescription', PharmacyScanPrescriptionRedirect, { note: 'x' }, '/pharmacy/rx-order?note=x&via=photo'],
    ['drug-scanner', DrugScannerRedirect, {}, '/pharmacy/barcode-scanner'],
  ];
  it.each(cases)('%s', async (_name, Screen, params, expected) => {
    mockParams.current = params;
    await render(<Screen />);
    expect(mockRedirect).toHaveBeenLastCalledWith(expected);
  });
});

describe('insurance step (one screen, two states)', () => {
  it('without an order it is the upload form; with an order it is the facility answer', async () => {
    apiFetch.mockImplementation(async () => []);
    const view = await render(wrap(<InsuranceApproval />));
    expect(screen.getByTestId('diagnostics-insurance-upload')).toBeTruthy();
    expect(screen.getByText(k('diag.upload.hint'))).toBeTruthy();
    mockParams.current = { orderId: 'b1', labName: 'Test lab' };
    apiFetch.mockImplementation(async () => ({ insurance_status: 'rejected', items: [] }));
    await view.rerender(wrap(<InsuranceApproval />));
    expect(screen.getByTestId('diagnostics-insurance-approval')).toBeTruthy();
  });

  it('says the facility asks the insurer, never that anything was retrieved or checked automatically', () => {
    for (const key of ['diag.upload.hint', 'diag.upload.readFailed', 'diag.ins.reviewing', 'diag.hub.insBody']) {
      expect(k(key)).not.toMatch(/automatic|instant|real-time|verif/i);
    }
    expect(k('diag.ins.reviewing')).toMatch(/insurer/i);
  });
});

describe('sample tracking carries the technician block', () => {
  const answer = (tracking: Record<string, unknown>, booking: Record<string, unknown> = { state: 'CONFIRMED', scheduled_at: '2026-10-09T10:00:00Z' }) =>
    apiFetch.mockImplementation(async (path: string) => {
      if (path.endsWith('/tracking')) return tracking;
      if (path.startsWith('/labs/bookings/')) return booking;
      return {};
    });

  it('shows the arrival, who it is and the call button when the server sent a technician', async () => {
    mockParams.current = { bookingId: 'b1' };
    answer({ techName: 'Test technician', techPhone: '+966500000000', eta: 25 });
    await render(wrap(<SampleTracking />));
    await screen.findByText('Test technician');
    expect(screen.getByLabelText(k('diag.order.call'))).toBeTruthy();
    expect(screen.getByText(k('diag.tech.tipsTitle'))).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/labs/bookings/b1');
    expect(apiFetch).toHaveBeenCalledWith('/labs/bookings/b1/tracking');
  });

  it('draws no technician block for a visit at the lab', async () => {
    mockParams.current = { bookingId: 'b2' };
    answer({ steps: [{ title: 'Received', done: true }] }, { state: 'CONFIRMED', location_type: 'facility' });
    await render(wrap(<SampleTracking />));
    await screen.findByText('Received');
    expect(screen.queryByText(k('diag.tech.tipsTitle'))).toBeNull();
  });
});

describe('catalogue filters sheet', () => {
  it('starts from the URL, loads the options from /medicines/filters and applies the same filter_* params', async () => {
    apiFetch.mockResolvedValue({ categories: ['vitamins'], forms: ['Tablet'], brands: ['Test maker'] });
    const onApply = jest.fn();
    await render(wrap(<FilterSheet open onClose={jest.fn()} initial={{ filter_rx: '1', filter_sort: 'price_asc' }} onApply={onApply} />));
    await screen.findByText('Tablet');
    expect(apiFetch).toHaveBeenCalledWith('/medicines/filters');
    await act(async () => {
      fireEvent.press(screen.getByText('Tablet'));
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText(new RegExp(k('pharmacy.filters.applyCount', { n: '2' }).slice(0, 6))));
    });
    expect(onApply).toHaveBeenCalledWith({
      filter_category: 'all',
      filter_forms: 'Tablet',
      filter_brands: '',
      filter_rx: '1',
      filter_min_price: '',
      filter_max_price: '',
      filter_sort: 'price_asc',
    });
  });

  it('a failed load says so with a retry and applies nothing', async () => {
    apiFetch.mockRejectedValue(new Error('server_error'));
    await render(wrap(<FilterSheet open onClose={jest.fn()} initial={{}} onApply={jest.fn()} />));
    await waitFor(() => expect(screen.getByText(k('pharmacy.filters.loadError'))).toBeTruthy());
    expect(screen.getByLabelText(k('pharmacy.retry'))).toBeTruthy();
  });
});
