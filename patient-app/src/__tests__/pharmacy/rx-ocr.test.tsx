import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RxOrderScreen from '../../../app/pharmacy/rx-order';
import * as mockPicker from 'expo-image-picker';
import { message } from '../../components/screen/ScreenKit';

/**
 * PT-27: the prescription photo path. All values are TEST values. What is proved: nothing is sent until the patient presses
 * save; the OCR lines are the ones saved with the prescription; an empty or failed reading saves nothing and says so, and
 * the typed way in stays one tap away; the saved prescription is listed line by line (unnamed lines dropped, quantity only
 * when the server sent one); a prescription with no lines offers a new upload and no continue button.
 */
const mockApi = jest.fn();
const mockReplace = jest.fn();
const mockSetParams = jest.fn();
const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: (...a: unknown[]) => mockReplace(...a), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: (...a: unknown[]) => mockSetParams(...a) },
  useLocalSearchParams: () => mockParams.current,
  useFocusEffect: (cb: () => void) => { require('react').useEffect(cb, []); },
}));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../hooks/useUploadsEnabled', () => ({ useUploadsEnabled: () => true }));
jest.mock('../../utils/api', () => ({ ...jest.requireActual('../../utils/api'), apiFetch: (...a: unknown[]) => mockApi(...a) }));

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const tap = async (el: Parameters<typeof fireEvent.press>[0]) => { await act(async () => { fireEvent.press(el); }); };
const posts = () => mockApi.mock.calls.filter((c) => (c[1] as { method?: string } | undefined)?.method === 'POST');

beforeEach(() => {
  mockApi.mockReset();
  (mockPicker.launchCameraAsync as jest.Mock).mockClear();
  mockReplace.mockReset();
  mockSetParams.mockReset();
  mockParams.current = { via: 'photo' };
  mockApi.mockResolvedValue([]);
  (mockPicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  (mockPicker.launchCameraAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///test.jpg', base64: 'QUJD' }] });
});

const takePhoto = async () => {
  await render(wrap(<RxOrderScreen />));
  await tap(await screen.findByLabelText(k('pharmacy.scan.camera')));
  await screen.findByLabelText(k('pharmacy.scan.remove'));
};

describe('photo way in', () => {
  it('sends nothing before save, and save is off without a photo', async () => {
    await render(wrap(<RxOrderScreen />));
    await screen.findByTestId('scan-save');
    expect(screen.getByTestId('scan-save').props.accessibilityState?.disabled).toBe(true);
    expect(posts()).toHaveLength(0);
    await takePhoto();
    expect(posts()).toHaveLength(0);
  });

  it('saves the lines the reading found, then opens the saved prescription', async () => {
    const items = [{ name: 'Test medicine A', dose: '500 mg' }, { name: 'Test medicine B' }];
    mockApi.mockImplementation(async (path: string) => {
      if (path === '/ai/prescription-ocr') return { items };
      if (path === '/prescriptions/upload') return { id: 'rx-1' };
      return [];
    });
    await takePhoto();
    await tap(screen.getByTestId('scan-save'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({ pathname: '/pharmacy/rx-order', params: { prescriptionId: 'rx-1' } }));
    const upload = posts().find((c) => c[0] === '/prescriptions/upload');
    const body = JSON.parse((upload?.[1] as { body: string }).body);
    expect(body.items).toEqual(items);
    expect(body.upload_image).toBe('data:image/jpeg;base64,QUJD');
  });

  it('a reading with no lines saves nothing and says the photo was not readable', async () => {
    mockApi.mockImplementation(async (path: string) => (path === '/ai/prescription-ocr' ? { items: [] } : []));
    await takePhoto();
    await tap(screen.getByTestId('scan-save'));
    await screen.findByText(k('pharmacy.scan.unreadable'));
    expect(posts().some((c) => c[0] === '/prescriptions/upload')).toBe(false);
    expect(mockReplace).not.toHaveBeenCalled();
    // the manual way in is one tap away
    await tap(screen.getByText(k('pharmacy.rx.viaType')));
    expect(mockSetParams).toHaveBeenCalledWith({ via: 'type' });
  });

  it('a failed reading says the save failed and saves nothing', async () => {
    mockApi.mockImplementation(async (path: string) => { if (path === '/ai/prescription-ocr') throw new Error('ocr down'); return []; });
    await takePhoto();
    await tap(screen.getByTestId('scan-save'));
    await screen.findByText(k('pharmacy.scan.errorTitle'));
    expect(posts().some((c) => c[0] === '/prescriptions/upload')).toBe(false);
  });

  it('a refused camera permission says so and picks nothing', async () => {
    (mockPicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
    await render(wrap(<RxOrderScreen />));
    await tap(await screen.findByLabelText(k('pharmacy.scan.camera')));
    await screen.findByText(k('pharmacy.scan.permCameraTitle'));
    expect(mockPicker.launchCameraAsync as jest.Mock).not.toHaveBeenCalled();
  });
});

describe('saved prescription', () => {
  it('lists the named lines with dose and a quantity only when sent, and continues to checkout', async () => {
    mockParams.current = { prescriptionId: 'rx-1' };
    mockApi.mockResolvedValue({ id: 'rx-1', status: 'UPLOADED_BY_PATIENT', items: [{ name: 'Test medicine A', dose: '500 mg', quantity: 2 }, { name: 'Test medicine B' }, { name: '   ' }] });
    await render(wrap(<RxOrderScreen />));
    await screen.findByText('Test medicine A');
    expect(screen.getByText('500 mg')).toBeTruthy();
    expect(screen.getByText(k('pharmacy.rx.qty', { n: '2' }))).toBeTruthy();
    expect(screen.getByText('Test medicine B')).toBeTruthy();
    expect(screen.queryAllByText(/^Quantity/)).toHaveLength(1);
    await tap(screen.getByTestId('rx-continue'));
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/pharmacy/checkout', params: { prescriptionId: 'rx-1' } });
  });

  it('a prescription with no named lines offers a new upload and no continue button', async () => {
    mockParams.current = { prescriptionId: 'rx-2' };
    mockApi.mockResolvedValue({ id: 'rx-2', items: [] });
    await render(wrap(<RxOrderScreen />));
    await screen.findByText(k('pharmacy.rx.noLines'));
    expect(screen.queryByTestId('rx-continue')).toBeNull();
    await tap(screen.getByText(k('pharmacy.rx.uploadNew')));
    expect(mockReplace).toHaveBeenCalledWith('/pharmacy/rx-order');
  });
});
