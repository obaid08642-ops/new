import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'node:fs';
import path from 'node:path';

import authReducer from '../src/store/slices/authSlice';
import { CartProvider, useCart } from '../src/context/CartContext';

// Boundaries only: the API, the router, the app context, the camera and the picker. Fixtures live in this test.
const mockApiFetch = jest.fn();
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() };
let mockParams: Record<string, string> = {};
let mockCamera: { granted: boolean; canAskAgain: boolean } | null = { granted: true, canAskAgain: true };
let mockScan: ((e: { data: string }) => void) | undefined;
const mockRequestCamera = jest.fn();
const mockPickerPermission = jest.fn();
const mockLaunchLibrary = jest.fn();
const mockResolveAddress = jest.fn();
const mockAlert = jest.fn();
jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.mock('../src/utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), newIdempotencyKey: () => 'test-key', BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../src/utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../src/utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../src/utils/selectedAddress', () => ({ resolveEffectiveAddress: (...a: unknown[]) => mockResolveAddress(...a) }));
jest.mock('expo-router', () => {
  const R = require('react');
  return {
    get router() {
      return mockRouter;
    },
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (cb: () => void | (() => void)) => {
      R.useEffect(() => cb(), []); // eslint-disable-line react-hooks/exhaustive-deps
    },
  };
});
jest.mock('expo-camera', () => ({
  useCameraPermissions: () => [mockCamera, mockRequestCamera],
  CameraView: (props: { onBarcodeScanned?: (e: { data: string }) => void }) => {
    mockScan = props.onBarcodeScanned;
    return null;
  },
}));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: (...a: unknown[]) => mockPickerPermission(...a),
  requestMediaLibraryPermissionsAsync: (...a: unknown[]) => mockPickerPermission(...a),
  launchCameraAsync: (...a: unknown[]) => mockLaunchLibrary(...a),
  launchImageLibraryAsync: (...a: unknown[]) => mockLaunchLibrary(...a),
}));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('../src/context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'ar', isRTL: true }) }));
jest.mock('../src/components/LocalizedAlert', () => ({ showLocalizedAlert: (...a: unknown[]) => mockAlert(...a) }));

import Cart from '../app/pharmacy/cart';
import RxOrder from '../app/pharmacy/rx-order';
import BarcodeScanner from '../app/pharmacy/barcode-scanner';
import PharmacistChat from '../app/pharmacy/pharmacist-chat';

const LOCALES = { ar: require('../src/i18n/locales/ar.json'), en: require('../src/i18n/locales/en.json'), ur: require('../src/i18n/locales/ur.json'), hi: require('../src/i18n/locales/hi.json'), bn: require('../src/i18n/locales/bn.json'), tl: require('../src/i18n/locales/tl.json') } as Record<string, Record<string, string>>;
/** The Arabic text of a key, with its {slots} filled (the tests run in Arabic). */
const T = (key: string, vars: Record<string, string | number> = {}) => LOCALES.ar[key].replace(/\{(\w+)\}/g, (_s, n: string) => String(vars[n]));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const store = () => configureStore({ reducer: { auth: authReducer } });
function CartSeed({ lines }: { lines: Array<{ id: string; name: string; rx: boolean; qty: number; activeIngredient?: string; onlineOnly?: boolean }> }) {
  const { addItem, items } = useCart();
  React.useEffect(() => {
    lines.forEach((l) => void addItem(l));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <>{items.map((i) => <Text key={i.id}>{`in-cart:${i.id}:${i.qty}`}</Text>)}</>;
}
const wrap = (node: React.ReactNode, lines: Array<{ id: string; name: string; rx: boolean; qty: number; activeIngredient?: string; onlineOnly?: boolean }> = []) => (
  <Provider store={store()}>
    <SafeAreaProvider initialMetrics={metrics}>
      <CartProvider>
        {node}
        <CartSeed lines={lines} />
      </CartProvider>
    </SafeAreaProvider>
  </Provider>
);

beforeEach(async () => {
  jest.clearAllMocks();
  mockParams = {};
  mockCamera = { granted: true, canAskAgain: true };
  mockApiFetch.mockResolvedValue({});
  await AsyncStorage.clear();
});

describe('Batch 1b translations (owner rule: every key in all six languages, real translations)', () => {
  const keys = Object.keys(LOCALES.ar).filter((k) => /^pharmacy\.(cart|scan|rx|barcode|request|chat)\./.test(k) || k === 'pharmacy.openSettings');
  const slots = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

  it('has every key, non-empty, with the same {slots}, in all six files, and no Arabic script outside ar and ur', () => {
    expect(keys.length).toBeGreaterThan(100);
    for (const [lang, file] of Object.entries(LOCALES)) {
      for (const key of keys) {
        expect(typeof file[key] === 'string' && file[key].trim().length > 0).toBe(true);
        expect(slots(file[key])).toBe(slots(LOCALES.ar[key]));
        if (lang !== 'ar' && lang !== 'ur') expect(/[؀-ۿ]/.test(file[key])).toBe(false);
      }
    }
  });

  it('every key a screen of this slice asks for exists in the files (no key shown to the patient)', () => {
    const screens = ['app/pharmacy/cart.tsx', 'app/pharmacy/rx-order.tsx', 'src/components/pharmacy/RxIntake.tsx', 'src/components/pharmacy/ManualRequest.tsx', 'src/components/pharmacy/FilterSheet.tsx', 'app/pharmacy/barcode-scanner.tsx', 'app/pharmacy/pharmacist-chat.tsx'];
    for (const name of screens) {
      const src = fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
      for (const m of src.matchAll(/\bk\(\s*'([\w.]+)'/g)) expect(LOCALES.ar[m[1]]).toBeDefined();
    }
    // the prescription states and chat resolutions are asked for by a computed key
    for (const s of ['UPLOADED_BY_PATIENT', 'CREATED_BY_DOCTOR', 'SENT_TO_PHARMACY', 'PARTIALLY_EDITED', 'VERIFIED_BY_PHARMACIST', 'APPROVED', 'DISPENSED', 'ARCHIVED']) expect(LOCALES.ar[`pharmacy.rx.state.${s}`]).toBeDefined();
    for (const s of ['accepted', 'rejected', 'removed']) expect(LOCALES.ar[`pharmacy.chat.resolution.${s}`]).toBeDefined();
  });
});

describe('Cart (board Cart)', () => {
  it('an empty cart says so and leads back to the pharmacy hub', async () => {
    await render(wrap(<Cart />));
    expect(screen.getByText(T('pharmacy.cart.emptyTitle'))).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(T('pharmacy.cart.emptyAction')));
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/pharmacy');
  });

  it('draws the real lines, changes the quantity with named buttons, removes a line, and never invents a price', async () => {
    await render(wrap(<Cart />, [{ id: 'a', name: 'دواء أ', rx: false, qty: 2, activeIngredient: 'مادة فعالة' }]));
    await waitFor(() => expect(screen.getByText('دواء أ')).toBeTruthy());
    expect(screen.getByText('مادة فعالة')).toBeTruthy();
    expect(screen.queryByText(/ر\.س|SAR|\d+\.\d\d/)).toBeNull();
    // no prescription medicine: no banner, the button asks for offers
    expect(screen.queryByText(T('pharmacy.cart.rxBannerTitle'))).toBeNull();
    await fireEvent.press(screen.getByLabelText(T('pharmacy.cart.increase', { name: 'دواء أ' })));
    await waitFor(() => expect(screen.getByText('in-cart:a:3')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText(T('pharmacy.cart.decrease', { name: 'دواء أ' })));
    await waitFor(() => expect(screen.getByText('in-cart:a:2')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText(T('pharmacy.cart.ctaRequest')));
    expect(mockRouter.push).toHaveBeenCalledWith('/pharmacy/checkout');
    await fireEvent.press(screen.getByLabelText(T('pharmacy.cart.remove', { name: 'دواء أ' })));
    await waitFor(() => expect(screen.getByText(T('pharmacy.cart.emptyTitle'))).toBeTruthy());
  });

  it('draws the "online only" chip on the line that was added with the flag, and on no other line', async () => {
    await render(wrap(<Cart />, [
      { id: 'o', name: 'دواء أونلاين', rx: false, qty: 1, onlineOnly: true },
      { id: 'p', name: 'دواء عادي', rx: false, qty: 1 },
    ]));
    await waitFor(() => expect(screen.getByText('دواء أونلاين')).toBeTruthy());
    expect(screen.getAllByText(T('pharmacy.product.exclusive'))).toHaveLength(1);
  });

  it('a prescription medicine shows the banner (upload) and the button chooses the prescription first', async () => {
    await render(wrap(<Cart />, [{ id: 'r', name: 'دواء ر', rx: true, qty: 1 }]));
    await waitFor(() => expect(screen.getByText(T('pharmacy.cart.rxBannerTitle'))).toBeTruthy());
    await fireEvent.press(screen.getByLabelText(T('pharmacy.cart.rxBannerAction')));
    expect(mockRouter.push).toHaveBeenCalledWith('/pharmacy/rx-order?via=photo');
    await fireEvent.press(screen.getByLabelText(T('pharmacy.cart.ctaRx')));
    expect(mockRouter.push).toHaveBeenCalledWith('/pharmacy/rx-order');
  });

  it('emptying the cart asks first, with translated texts', async () => {
    await render(wrap(<Cart />, [{ id: 'a', name: 'دواء أ', rx: false, qty: 1 }]));
    await waitFor(() => expect(screen.getByText('دواء أ')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText(T('pharmacy.cart.clear')));
    expect(mockAlert).toHaveBeenCalledWith(T('pharmacy.cart.clearTitle'), T('pharmacy.cart.clearBody'), expect.any(Array));
    const buttons = mockAlert.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    expect(buttons.map((b) => b.text)).toEqual([T('pharmacy.cancel'), T('pharmacy.cart.clearConfirm')]);
    await waitFor(() => buttons[1].onPress?.());
    await waitFor(() => expect(screen.getByText(T('pharmacy.cart.emptyTitle'))).toBeTruthy());
  });
});

describe('Prescription order (RxUpload family)', () => {
  it('lists the active prescriptions with their real state, count and no invented price', async () => {
    mockApiFetch.mockImplementation(async (p: string) => (p === '/prescriptions/active' ? [{ id: 'rx-abcdef', state: 'UPLOADED_BY_PATIENT', createdAt: '2026-10-01T09:30:00.000Z', items: [{ medicine_name_ar: 'أ' }, { medicine_name_ar: 'ب' }] }] : {}));
    await render(wrap(<RxOrder />));
    await waitFor(() => expect(screen.getByText(T('pharmacy.rx.number', { id: 'ABCDEF' }))).toBeTruthy());
    expect(screen.getByText(T('pharmacy.rx.state.UPLOADED_BY_PATIENT'))).toBeTruthy();
    expect(screen.getByText(/2/)).toBeTruthy();
    expect(screen.queryByText(/ر\.س/)).toBeNull();
    await fireEvent.press(screen.getByLabelText(T('pharmacy.rx.number', { id: 'ABCDEF' })));
    expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/pharmacy/rx-order', params: { prescriptionId: 'rx-abcdef' } });
  });

  it('without a prescription it offers the three ways in; the one in the URL decides which form is shown', async () => {
    mockApiFetch.mockResolvedValue([]);
    const view = await render(wrap(<RxOrder />));
    expect(screen.getByLabelText(T('pharmacy.rx.ways'))).toBeTruthy();
    expect(screen.getByLabelText(T('pharmacy.scan.camera'))).toBeTruthy();
    expect(screen.queryByTestId('request-name')).toBeNull();
    mockParams = { via: 'upload' };
    await view.rerender(wrap(<RxOrder />));
    expect(screen.getByLabelText(T('pharmacy.scan.photos'))).toBeTruthy();
    expect(screen.queryByLabelText(T('pharmacy.scan.camera'))).toBeNull();
    mockParams = { via: 'type' };
    await view.rerender(wrap(<RxOrder />));
    expect(screen.getByTestId('request-name')).toBeTruthy();
    // choosing a way writes it to the URL
    await fireEvent.press(screen.getByLabelText(T('pharmacy.rx.viaPhoto')));
    expect(mockRouter.setParams).toHaveBeenCalledWith({ via: 'photo' });
  });

  it('a prescription shows its medicines without a quantity the API did not send, and continues to the checkout', async () => {
    mockParams = { prescriptionId: 'rx-1' };
    mockApiFetch.mockImplementation(async (p: string) => (p === '/prescriptions/rx-1' ? { id: 'rx-1', status: 'VERIFIED_BY_PHARMACIST', items: [{ name: 'دواء أ', dose: '500 مغ' }, { name: 'دواء ب', quantity: 3 }] } : {}));
    await render(wrap(<RxOrder />));
    await waitFor(() => expect(screen.getByText('دواء أ')).toBeTruthy());
    expect(screen.getByText('500 مغ')).toBeTruthy();
    expect(screen.getAllByText(/^الكمية/)).toHaveLength(1);
    await fireEvent.press(screen.getByLabelText(T('pharmacy.rx.continue')));
    expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/pharmacy/checkout', params: { prescriptionId: 'rx-1' } });
  });

  it('a prescription with no named medicine cannot continue', async () => {
    mockParams = { prescriptionId: 'rx-2' };
    mockApiFetch.mockResolvedValue({ id: 'rx-2', status: 'UPLOADED_BY_PATIENT', items: [] });
    await render(wrap(<RxOrder />));
    await waitFor(() => expect(screen.getByText(T('pharmacy.rx.noLines'))).toBeTruthy());
    expect(screen.queryByLabelText(T('pharmacy.rx.continue'))).toBeNull();
  });

  it('a failed load shows the error state with a retry', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('boom')).mockResolvedValue([]);
    await render(wrap(<RxOrder />));
    await waitFor(() => expect(screen.getByText(T('pharmacy.rx.listError'))).toBeTruthy());
    await fireEvent.press(screen.getByLabelText(T('pharmacy.retry')));
    await waitFor(() => expect(screen.queryByText(T('pharmacy.rx.listError'))).toBeNull());
  });
});

describe('Order with a prescription: the photo and upload ways in (board RxUpload)', () => {
  it('a refused permission shows a translated notice with the way to the settings, and nothing is uploaded', async () => {
    mockPickerPermission.mockResolvedValue({ granted: false });
    await render(wrap(<RxOrder />));
    await fireEvent.press(screen.getByLabelText(T('pharmacy.scan.camera')));
    await waitFor(() => expect(screen.getByText(T('pharmacy.scan.permCameraTitle'))).toBeTruthy());
    expect(screen.getByLabelText(T('pharmacy.openSettings'))).toBeTruthy();
    expect(mockApiFetch.mock.calls.filter(([p]) => p !== '/prescriptions/active')).toEqual([]);
  });

  it('nothing is sent until the photo is chosen and the button is pressed; then it reads, saves and opens the prescription', async () => {
    mockPickerPermission.mockResolvedValue({ granted: true });
    mockLaunchLibrary.mockResolvedValue({ canceled: false, assets: [{ uri: 'file://rx.jpg', base64: 'QUJD' }] });
    mockApiFetch.mockImplementation(async (p: string) => (p === '/ai/prescription-ocr' ? { items: [{ name: 'دواء' }] } : p === '/prescriptions/upload' ? { id: 'rx-new' } : p === '/prescriptions/active' ? [] : {}));
    mockParams = { via: 'upload' };
    await render(wrap(<RxOrder />));
    await fireEvent.press(screen.getByLabelText(T('pharmacy.scan.photos')));
    await waitFor(() => expect(screen.getByLabelText(T('pharmacy.scan.remove'))).toBeTruthy());
    expect(mockApiFetch.mock.calls.filter(([p]) => p !== '/prescriptions/active')).toEqual([]);
    await fireEvent.changeText(screen.getByTestId('scan-note'), 'بديل أرخص');
    await fireEvent.press(screen.getByTestId('scan-save'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/pharmacy/rx-order', params: { prescriptionId: 'rx-new' } }));
    const upload = mockApiFetch.mock.calls.find(([p]) => p === '/prescriptions/upload');
    const body = JSON.parse((upload?.[1] as { body: string }).body);
    expect(body.upload_image).toBe('data:image/jpeg;base64,QUJD');
    expect(body.items).toEqual([{ name: 'دواء' }]);
    expect(body.notes).toContain('بديل أرخص');
  });

  it('a failed save keeps the photo and says so, with the button available to try again', async () => {
    mockPickerPermission.mockResolvedValue({ granted: true });
    mockLaunchLibrary.mockResolvedValue({ canceled: false, assets: [{ uri: 'file://rx.jpg', base64: 'QUJD' }] });
    mockApiFetch.mockRejectedValue(new Error('OFFLINE_ERROR'));
    mockParams = { via: 'upload' };
    await render(wrap(<RxOrder />));
    await fireEvent.press(screen.getByLabelText(T('pharmacy.scan.photos')));
    await waitFor(() => expect(screen.getByTestId('scan-save')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('scan-save'));
    await waitFor(() => expect(screen.getByText(T('pharmacy.scan.errorTitle'))).toBeTruthy());
    expect(screen.getByLabelText(T('pharmacy.scan.remove'))).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});

describe('Order with a prescription: type the names (the old manual request)', () => {
  const address = { id: 'addr', label: 'المنزل', street: 'شارع', city: 'الرياض', lat: 24.7, lng: 46.7 };

  it('needs three letters, shows the address it will use, and broadcasts with the same idempotency key on both calls', async () => {
    mockResolveAddress.mockResolvedValue(address);
    mockApiFetch.mockImplementation(async (p: string) => (p === '/patient/pharmacy/orders' ? { id: 'order-1' } : {}));
    mockParams = { via: 'type' };
    await render(wrap(<RxOrder />));
    await waitFor(() => expect(screen.getByText('المنزل')).toBeTruthy());
    await fireEvent.changeText(screen.getByTestId('request-name'), 'بن');
    expect(screen.getByText(T('pharmacy.request.nameHint'))).toBeTruthy();
    await fireEvent.press(screen.getByTestId('request-submit'));
    expect(mockApiFetch).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByTestId('request-name'), 'بنادول');
    await fireEvent.changeText(screen.getByTestId('request-details'), '500 مغ');
    await fireEvent.press(screen.getByTestId('request-submit'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/pharmacy/broadcast-status', params: { orderId: 'order-1' } }));
    const calls = mockApiFetch.mock.calls.map(([p, init]) => [p, (init as { headers?: Record<string, string> } | undefined)?.headers?.['Idempotency-Key']]);
    expect(calls).toEqual([['/patient/pharmacy/orders', 'test-key'], ['/patient/pharmacy/orders/order-1/submit', 'test-key-submit']]);
    const draft = JSON.parse((mockApiFetch.mock.calls[0][1] as { body: string }).body);
    expect(draft.items[0].raw_name).toBe('بنادول — 500 مغ');
  });

  it('an address with no map point explains instead of sending', async () => {
    mockResolveAddress.mockResolvedValue({ id: 'addr', label: 'بلا موقع' });
    mockParams = { via: 'type' };
    await render(wrap(<RxOrder />));
    await waitFor(() => expect(screen.getByText('بلا موقع')).toBeTruthy());
    await fireEvent.changeText(screen.getByTestId('request-name'), 'بنادول');
    await fireEvent.press(screen.getByTestId('request-submit'));
    await waitFor(() => expect(screen.getByText(T('pharmacy.request.noLocation'))).toBeTruthy());
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('a refused request says nothing was created, in the screen, not in a system alert', async () => {
    mockResolveAddress.mockResolvedValue(address);
    mockApiFetch.mockRejectedValue(new Error('x'));
    mockParams = { via: 'type' };
    await render(wrap(<RxOrder />));
    await waitFor(() => expect(screen.getByText('المنزل')).toBeTruthy());
    await fireEvent.changeText(screen.getByTestId('request-name'), 'بنادول');
    await fireEvent.press(screen.getByTestId('request-submit'));
    await waitFor(() => expect(screen.getByText(T('pharmacy.request.failedTitle'))).toBeTruthy());
    expect(mockAlert).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});

describe('Barcode scanner', () => {
  it('asking for the camera, refused (ask again), and blocked (open the settings) are three different states', async () => {
    mockCamera = null;
    const view = await render(wrap(<BarcodeScanner />));
    expect(screen.getByLabelText(T('pharmacy.loading'))).toBeTruthy();
    mockCamera = { granted: false, canAskAgain: true };
    await view.rerender(wrap(<BarcodeScanner />));
    await fireEvent.press(screen.getByLabelText(T('pharmacy.barcode.permAllow')));
    expect(mockRequestCamera).toHaveBeenCalled();
    mockCamera = { granted: false, canAskAgain: false };
    await view.rerender(wrap(<BarcodeScanner />));
    expect(screen.getByText(T('pharmacy.barcode.permBlocked'))).toBeTruthy();
    expect(screen.getByLabelText(T('pharmacy.openSettings'))).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(T('pharmacy.barcode.manual')));
    expect(mockRouter.push).toHaveBeenCalledWith('/pharmacy/rx-order?via=type');
  });
});

describe('Barcode lookup', () => {
  it('a found medicine shows what the directory sent (no availability claim) and can go to the cart', async () => {
    mockApiFetch.mockResolvedValue({ found: true, medicine: { id: 'm1', name_ar: 'دواء ١', manufacturer: 'شركة', price: 18.5, requires_prescription: true } });
    await render(wrap(<BarcodeScanner />));
    await waitFor(() => expect(mockScan).toBeDefined());
    await mockScan?.({ data: '6281234567890' });
    await waitFor(() => expect(screen.getByText('دواء ١')).toBeTruthy());
    expect(mockApiFetch).toHaveBeenCalledWith('/medicines/by-barcode/6281234567890');
    expect(screen.getByText(/18\.50/)).toBeTruthy();
    expect(screen.getByText(T('pharmacy.needsRx'))).toBeTruthy();
    expect(screen.queryByText(/متوفر/)).toBeNull();
    await fireEvent.press(screen.getByLabelText(T('pharmacy.addToCart')));
    await waitFor(() => expect(screen.getByText('in-cart:m1:1')).toBeTruthy());
    expect(mockRouter.push).toHaveBeenCalledWith('/pharmacy/cart');
  });

  it('a found medicine can be checked for interactions: its name goes to the server, the verdict and hits are the server\'s', async () => {
    mockApiFetch.mockImplementation(async (p: string) => {
      if (p.startsWith('/medicines/by-barcode/')) return { found: true, medicine: { id: 'm1', name_ar: 'دواء ١', price: 5 } };
      if (p === '/ai/drug-interactions') return { checked: 2, safe: false, interactions: [{ severity: 'high', note_ar: 'ملاحظة اختبار' }] };
      return {};
    });
    await render(wrap(<BarcodeScanner />));
    await waitFor(() => expect(mockScan).toBeDefined());
    await mockScan?.({ data: '6281234567890' });
    await waitFor(() => expect(screen.getByText('دواء ١')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText(T('pharmacy.scan.ixCheck')));
    await waitFor(() => expect(screen.getByText(T('pharmacy.scan.ixAttention'))).toBeTruthy());
    const call = mockApiFetch.mock.calls.find(([p]) => p === '/ai/drug-interactions');
    expect(JSON.parse((call?.[1] as { body: string }).body)).toEqual({ drugs: ['دواء ١'] });
    expect(screen.getByText(T('pharmacy.scan.ixHigh'))).toBeTruthy();
    expect(screen.getByText('ملاحظة اختبار')).toBeTruthy();
  });

  it('a barcode can be typed: it goes through the same lookup', async () => {
    mockApiFetch.mockResolvedValue({ found: false });
    await render(wrap(<BarcodeScanner />));
    await fireEvent.changeText(screen.getByLabelText(T('pharmacy.scan.typeCode')), '12345');
    await fireEvent.press(screen.getByLabelText(T('pharmacy.scan.typeGo')));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/medicines/by-barcode/12345'));
  });

  it('a code that is not in the directory and a failed lookup are different states; the failed one can be retried', async () => {
    mockApiFetch.mockResolvedValueOnce({ found: false });
    const view = await render(wrap(<BarcodeScanner />));
    await waitFor(() => expect(mockScan).toBeDefined());
    await mockScan?.({ data: '111' });
    await waitFor(() => expect(screen.getByText(T('pharmacy.barcode.notFoundTitle'))).toBeTruthy());
    await fireEvent.press(screen.getByLabelText(T('pharmacy.barcode.scanAnotherCode')));
    mockApiFetch.mockRejectedValueOnce(new Error('OFFLINE_ERROR')).mockResolvedValueOnce({ found: false });
    await mockScan?.({ data: '222' });
    await waitFor(() => expect(screen.getByText(T('pharmacy.barcode.errorTitle'))).toBeTruthy());
    expect(screen.queryByText(T('pharmacy.barcode.notFoundTitle'))).toBeNull();
    await fireEvent.press(screen.getByLabelText(T('pharmacy.retry')));
    await waitFor(() => expect(screen.getByText(T('pharmacy.barcode.notFoundTitle'))).toBeTruthy());
    view.unmount();
  });
});

describe('Pharmacist chat (no board)', () => {
  it('without an order id there is no chat to show: it says so and points to the orders, and calls nothing', async () => {
    await render(wrap(<PharmacistChat />));
    expect(screen.getByText(T('pharmacy.chat.noOrderTitle'))).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(T('pharmacy.hub.orders')));
    expect(mockRouter.replace).toHaveBeenCalledWith('/orders');
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('draws the thread, the substitute with the price from the offer, and records a decision with its own key', async () => {
    mockParams = { orderId: 'o1' };
    mockApiFetch.mockImplementation(async (p: string, init?: { method?: string }) => {
      if (p.startsWith('/pharmacy/chat/threads?order_id=o1')) return [{ id: 't1', order_id: 'o1', status: 'open' }];
      if (p === '/pharmacy/chat/threads/t1/messages' && !init?.method) {
        return { thread: { id: 't1', status: 'open' }, messages: [{ id: 'm1', sender_role: 'pharmacy', text: 'نقترح بديلًا', substitute_offer: { name: 'بديل', price: 12.5 } }] };
      }
      return {};
    });
    await render(wrap(<PharmacistChat />));
    await waitFor(() => expect(screen.getByText('نقترح بديلًا')).toBeTruthy());
    expect(screen.getByText(T('pharmacy.chat.substitute', { name: 'بديل' }))).toBeTruthy();
    expect(screen.getByText(/12\.50/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(T('pharmacy.chat.reject')));
    await waitFor(() => expect(mockApiFetch.mock.calls.some(([p, init]) => p === '/pharmacy/chat/threads/t1/reject' && (init as { method?: string }).method === 'POST')).toBe(true));
  });

  it('a blocked message (phone number, link) is explained; a closed thread has no composer and shows its resolution', async () => {
    mockParams = { orderId: 'o1' };
    let closed = false;
    mockApiFetch.mockImplementation(async (p: string, init?: { method?: string }) => {
      if (p.startsWith('/pharmacy/chat/threads?')) return [{ id: 't1', status: closed ? 'closed' : 'open' }];
      if (p === '/pharmacy/chat/threads/t1/messages' && init?.method === 'POST') throw new Error(JSON.stringify({ code: 'content_blocked', reason: 'url' }));
      if (p === '/pharmacy/chat/threads/t1/messages') return { thread: { id: 't1', status: closed ? 'closed' : 'open', resolution: closed ? 'accepted' : undefined }, messages: [] };
      return {};
    });
    const view = await render(wrap(<PharmacistChat />));
    await waitFor(() => expect(screen.getByTestId('chat-send')).toBeTruthy());
    await fireEvent.changeText(screen.getByLabelText(T('pharmacy.chat.placeholder')), 'www.example.com');
    await fireEvent.press(screen.getByTestId('chat-send'));
    await waitFor(() => expect(screen.getByText(T('pharmacy.chat.blocked'))).toBeTruthy());
    closed = true;
    await view.unmount();
    await render(wrap(<PharmacistChat />));
    await waitFor(() => expect(screen.getByText(T('pharmacy.chat.resolution.accepted'))).toBeTruthy());
    expect(screen.queryByTestId('chat-send')).toBeNull();
  });
});
