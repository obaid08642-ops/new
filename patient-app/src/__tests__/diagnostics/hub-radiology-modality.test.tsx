import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DiagnosticsHub from '../../../app/(tabs)/diagnostics';
import { message } from '../../components/screen/ScreenKit';

/** Owner review G4 (lead round): the radiology side filters by category chips (X-ray, CT, MRI, ultrasound, mammography, ECG/echo) on the client, from each scan's modality. TEST values. */

jest.setTimeout(30000);
const mockApi = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({ tab: 'radiology' }),
  useFocusEffect: () => undefined,
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
// the header carries the service cart button (owner layout decision 2), which reads the pharmacy cart count
jest.mock('../../context/CartContext', () => ({ useCart: () => ({ itemCount: 0 }) }));
const mockAdd = jest.fn();
jest.mock('../../context/DiagnosticsCartContext', () => ({
  useDiagnosticsCart: () => ({ items: [], itemCount: 0, total: 0, addItem: (...a: unknown[]) => mockAdd(...a), removeItem: jest.fn() }),
}));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApi(...a), BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test' }));

const k = (key: string) => message('en', key);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };

const ALL = [
  { id: 'r-mri', name_en: 'Test knee scan', modality: 'mri', price: 500, home_visit_supported: true, popularity: 5 },
  { id: 'r-us', name_en: 'Test belly scan', modality: 'ultrasound', price: 100, home_visit_supported: true, popularity: 1 },
];

describe('Diagnostics hub, radiology: category chips', () => {
  beforeEach(() => {
    mockApi.mockReset();
    mockPush.mockReset();
    mockAdd.mockReset();
    mockApi.mockImplementation(async (path: string) => (path === '/radiology/services' ? ALL : []));
  });

  it('filters the loaded scans by their category on the client and back to all (no server call per chip)', async () => {
    await render(<SafeAreaProvider initialMetrics={metrics}><DiagnosticsHub /></SafeAreaProvider>);
    await waitFor(() => expect(screen.getByTestId('diag-scan-r-us')).toBeTruthy(), { timeout: 15000 });
    expect(screen.getByLabelText(k('diag.cat.group'))).toBeTruthy();
    expect(screen.getAllByTestId('diag-art-mri', { hidden: true }).length).toBeGreaterThan(0); // one illustration per category
    await fireEvent.press(screen.getByTestId('diag-cat-mri'));
    await waitFor(() => expect(screen.queryByTestId('diag-scan-r-us')).toBeNull());
    expect(screen.getByTestId('diag-scan-r-mri')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('diag-cat-all'));
    await waitFor(() => expect(screen.getByTestId('diag-scan-r-us')).toBeTruthy());
    expect(mockApi.mock.calls.filter(([path]) => String(path).includes('modality'))).toHaveLength(0);
  });

  it('shows a category with nothing in it as an empty line, not a blank screen', async () => {
    await render(<SafeAreaProvider initialMetrics={metrics}><DiagnosticsHub /></SafeAreaProvider>);
    await waitFor(() => expect(screen.getByTestId('diag-scan-r-us')).toBeTruthy(), { timeout: 15000 });
    await fireEvent.press(screen.getByTestId('diag-cat-mammography'));
    await waitFor(() => expect(screen.getByText(k('diag.empty.noMatch'))).toBeTruthy());
  });

  it('Order now on a scan skips the cart: the lab choice with that one scan', async () => {
    await render(<SafeAreaProvider initialMetrics={metrics}><DiagnosticsHub /></SafeAreaProvider>);
    await waitFor(() => expect(screen.getByTestId('diag-scan-r-mri')).toBeTruthy(), { timeout: 15000 });
    await fireEvent.press(screen.getByTestId('diag-scan-r-mri-order'));
    expect(mockAdd).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/diagnostics/lab-comparison', params: { kind: 'radiology', id: 'r-mri', name: 'Test knee scan', single: '1', mode: 'home', payer: 'cash' } });
  });
});
