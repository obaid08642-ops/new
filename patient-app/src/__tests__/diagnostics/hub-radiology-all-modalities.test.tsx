import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DiagnosticsHub from '../../../app/(tabs)/diagnostics';
import { message } from '../../components/screen/ScreenKit';
import { serveCatalog } from './catalogServer';

/** Owner review G4 (lead round): the radiology side filters by category chips (X-ray, CT, MRI, ultrasound, mammography, ECG/echo) on the SERVER (the scan's category = its modality). TEST values. */

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
  { id: 'r-us', name_en: 'Test belly scan', modality: 'ultrasound', category: 'ultrasound', price: 100, home_visit_supported: true, popularity: 4 },
  { id: 'r-xr', name_en: 'Test chest scan', modality: 'xray', category: 'xray', price: 80, home_visit_supported: false, popularity: 3 },
  { id: 'r-ct', name_en: 'Test head scan', modality: 'ct', category: 'ct', price: 400, home_visit_supported: false, popularity: 2 },
  { id: 'r-mri', name_en: 'Test knee scan', modality: 'mri', category: 'mri', price: 500, home_visit_supported: false, popularity: 1 },
];

/** R1: with the default place (home) the list used to keep only the portable ultrasound; All must show every offered scan. */
describe('Diagnostics hub, radiology: all four modalities', () => {
  beforeEach(() => {
    mockApi.mockReset();
    mockPush.mockReset();
    mockApi.mockImplementation(async (path: string) => serveCatalog(path, { scans: ALL }));
  });

  it('shows every scan with All and each chip keeps its own modality', async () => {
    await render(<SafeAreaProvider initialMetrics={metrics}><DiagnosticsHub /></SafeAreaProvider>);
    await waitFor(() => expect(screen.getByTestId('diag-scan-r-us')).toBeTruthy(), { timeout: 15000 });
    for (const id of ['r-us', 'r-xr', 'r-ct', 'r-mri']) expect(screen.getByTestId(`diag-scan-${id}`)).toBeTruthy();
    const paths = mockApi.mock.calls.map(([path]) => String(path));
    expect(paths.some((path) => path.startsWith('/radiology/services?page=1&limit=20') && path.includes('home_visit'))).toBe(false);
    for (const [chip, id] of [['xray', 'r-xr'], ['ct', 'r-ct'], ['mri', 'r-mri'], ['ultrasound', 'r-us']] as const) {
      await fireEvent.press(screen.getByTestId(`diag-cat-${chip}`));
      await waitFor(() => expect(screen.getByTestId(`diag-scan-${id}`)).toBeTruthy());
      await waitFor(() => expect(screen.getAllByTestId(/^diag-scan-r-[a-z]+$/)).toHaveLength(1));
    }
    await fireEvent.press(screen.getByTestId('diag-cat-all'));
    await waitFor(() => expect(screen.getAllByTestId(/^diag-scan-r-[a-z]+$/)).toHaveLength(4));
  });

  it('Order now on a scan that cannot be done at home opens the order at the centre', async () => {
    await render(<SafeAreaProvider initialMetrics={metrics}><DiagnosticsHub /></SafeAreaProvider>);
    await waitFor(() => expect(screen.getByTestId('diag-scan-r-ct')).toBeTruthy(), { timeout: 15000 });
    await fireEvent.press(screen.getByTestId('diag-scan-r-ct-order'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/diagnostics/lab-comparison', params: { kind: 'radiology', id: 'r-ct', name: 'Test head scan', single: '1', mode: 'facility', payer: 'cash' } });
  });
});
