import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DiagnosticsHub from '../../../app/(tabs)/diagnostics';
import { message } from '../../components/screen/ScreenKit';

/** Web parity: the radiology side filters by scan type (GET /radiology/modalities, GET /radiology/services?modality=). TEST values. */

jest.setTimeout(30000);
const mockApi = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({ tab: 'radiology' }),
  useFocusEffect: () => undefined,
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
// the header carries the service cart button (owner layout decision 2), which reads the pharmacy cart count
jest.mock('../../context/CartContext', () => ({ useCart: () => ({ itemCount: 0 }) }));
jest.mock('../../context/DiagnosticsCartContext', () => ({
  useDiagnosticsCart: () => ({ items: [], itemCount: 0, total: 0, addItem: jest.fn(), removeItem: jest.fn() }),
}));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApi(...a), BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test' }));

const k = (key: string) => message('en', key);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };

const ALL = [
  { id: 'r-mri', name_en: 'Test MRI knee', price: 500, home_visit_supported: true },
  { id: 'r-us', name_en: 'Test ultrasound', price: 100, home_visit_supported: true },
];

describe('Diagnostics hub, radiology: scan type filter', () => {
  beforeEach(() => {
    mockApi.mockReset();
    mockApi.mockImplementation(async (path: string) => {
      if (path === '/radiology/modalities') return ['mri', 'ultrasound'];
      if (path === '/radiology/services?modality=mri') return [ALL[0]];
      if (path === '/radiology/services') return ALL;
      return [];
    });
  });

  it('asks the server for the chosen scan type and back to all', async () => {
    await render(<SafeAreaProvider initialMetrics={metrics}><DiagnosticsHub /></SafeAreaProvider>);
    await waitFor(() => expect(screen.getByText('Test ultrasound')).toBeTruthy(), { timeout: 15000 });
    await waitFor(() => expect(screen.getByText('MRI')).toBeTruthy());
    expect(screen.getByLabelText(k('diag.rad.modality'))).toBeTruthy();
    await fireEvent.press(screen.getByText('MRI'));
    await waitFor(() => expect(screen.queryByText('Test ultrasound')).toBeNull());
    expect(screen.getByText('Test MRI knee')).toBeTruthy();
    expect(mockApi).toHaveBeenCalledWith('/radiology/services?modality=mri');
    await fireEvent.press(screen.getByTestId('rad-modality-all'));
    await waitFor(() => expect(screen.getByText('Test ultrasound')).toBeTruthy());
  });
});
