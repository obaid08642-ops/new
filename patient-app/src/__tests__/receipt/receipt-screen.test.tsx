import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ReceiptScreen from '../../../app/receipts/[kind]/[bookingId]';
import { message } from '../../components/screen/ScreenKit';

/** The receipt card with the provider block, the refund state, Save as image and the share-link panel, drawn from test values shaped like GET /billing/invoice/:kind/:id. */
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({ kind: 'appointment', bookingId: 'b-1' }),
}));
jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../components/NabdLogo', () => ({ NabdLogo: () => null }));
jest.mock('../../components/LocalizedAlert', () => ({ showLocalizedAlert: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', apiFetch: jest.fn(), downloadProtected: jest.fn(), newIdempotencyKey: jest.fn(() => 'key-1') }));
const mockCapture = jest.fn(async () => 'file:///tmp/receipt.png');
jest.mock('react-native-view-shot', () => ({ captureRef: (...a: unknown[]) => mockCapture(...(a as [])) }), { virtual: true });
const mockSave = jest.fn(async () => undefined);
const mockAllow = jest.fn(async () => ({ granted: true }));
jest.mock('expo-media-library', () => ({ requestPermissionsAsync: (...a: unknown[]) => mockAllow(...(a as [])), saveToLibraryAsync: (...a: unknown[]) => mockSave(...(a as [])) }));
const mockCopy = jest.fn(async () => true);
jest.mock('expo-clipboard', () => ({ setStringAsync: (...a: unknown[]) => mockCopy(...(a as [])) }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { showLocalizedAlert } = require('../../components/LocalizedAlert') as { showLocalizedAlert: jest.Mock };
const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

const invoice = {
  invoice_no: 'INV-2026-000007', type: 'invoice', booking_kind: 'appointment', booking_id: 'b-1', booking_ref: 'AB12CD34', issued_at: '2026-10-31T10:00:00.000Z',
  subtotal: 100, vat_rate: 0.15, vat_amount: 15, total: 115, currency: 'SAR', state: 'partially_refunded', refunded_total: 20,
  credit_notes: [{ invoice_no: 'CN-2026-000001', total: -20, vat_amount: -2.61, issued_at: '2026-11-01T09:00:00.000Z' }],
  seller: { legal_name: null, vat_number: null, cr_number: null, address: null, configured: false },
  provider: { name_ar: 'د. سارة', name_en: 'Dr Test', facility_name: null, type: 'doctor', license_number: 'TEST-123' },
};
let links: Array<Record<string, unknown>> = [];
beforeEach(() => {
  jest.clearAllMocks();
  links = [];
  apiFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
    if (path === '/billing/invoice/appointment/b-1') return invoice;
    if (path.endsWith('/share-link') && init?.method === 'POST') {
      links = [{ id: 'l1', status: 'active', created_at: 'x', expires_at: '2026-11-08T00:00:00Z', view_count: 0 }];
      return { id: 'l1', token: 'tok-test-0123456789abcdef', expires_at: '2026-11-08T00:00:00Z' };
    }
    if (path.endsWith('/share-links')) return links;
    if (path.endsWith('/share-links/l1') && init?.method === 'DELETE') { links = [{ ...links[0], status: 'revoked' }]; return { id: 'l1', status: 'revoked' }; }
    throw new Error(`unexpected ${path}`);
  });
});

describe('the receipt screen', () => {
  it('draws the provider block, the booking number, the refund state, the credit note and says "not configured" for the company', async () => {
    await render(wrap(<ReceiptScreen />));
    expect(await screen.findByText('Dr Test')).toBeTruthy();
    expect(screen.getByText('TEST-123')).toBeTruthy();
    expect(screen.getByText(k('receipt.typeDoctor'))).toBeTruthy();
    expect(screen.getByText('AB12CD34')).toBeTruthy();
    expect(screen.getByText(k('receipt.statePartial'))).toBeTruthy();
    expect(screen.getByText(k('receipt.creditNoteRow', { no: 'CN-2026-000001' }))).toBeTruthy();
    expect(screen.getAllByText(k('receipt.notConfigured'))).toHaveLength(3);
  });

  it('saves the card as an image after asking for permission to add photos', async () => {
    await render(wrap(<ReceiptScreen />));
    await act(async () => { fireEvent.press(await screen.findByText(k('receipt.saveImage'))); });
    await waitFor(() => expect(mockSave).toHaveBeenCalledWith('file:///tmp/receipt.png'));
    expect(mockAllow).toHaveBeenCalledWith(true);
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ format: 'png' }));
    expect(showLocalizedAlert).toHaveBeenCalledWith(k('receipt.saveImage'), k('receipt.imageSaved'));
  });

  it('does not capture when the photos permission is refused', async () => {
    mockAllow.mockResolvedValueOnce({ granted: false });
    await render(wrap(<ReceiptScreen />));
    await act(async () => { fireEvent.press(await screen.findByText(k('receipt.saveImage'))); });
    await waitFor(() => expect(showLocalizedAlert).toHaveBeenCalledWith(k('receipt.saveImage'), k('receipt.imagePermission')));
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('creates a share link, shows the web address once with its expiry, copies it, and revokes it', async () => {
    await render(wrap(<ReceiptScreen />));
    await act(async () => { fireEvent.press(await screen.findByTestId('receipt-link-create')); });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/billing/invoice/appointment/b-1/share-link', expect.objectContaining({ method: 'POST', body: JSON.stringify({ expires_in_days: 7 }) })));
    expect(await screen.findByDisplayValue('https://nabd.plus/en/receipt/shared/tok-test-0123456789abcdef')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByTestId('receipt-link-copy')); });
    await waitFor(() => expect(mockCopy).toHaveBeenCalledWith('https://nabd.plus/en/receipt/shared/tok-test-0123456789abcdef'));
    expect(await screen.findByText(k('receipt.linkStatusActive'), { exact: false })).toBeTruthy();
    await act(async () => { fireEvent.press(await screen.findByTestId('receipt-link-revoke-l1')); });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/billing/invoice/appointment/b-1/share-links/l1', { method: 'DELETE' }));
    expect(await screen.findByText(k('receipt.linkStatusRevoked'), { exact: false })).toBeTruthy();
  });

  it('says so when the backend refuses more links', async () => {
    const original = apiFetch.getMockImplementation() as (...a: unknown[]) => Promise<unknown>;
    apiFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.endsWith('/share-link') && init?.method === 'POST') throw new Error('too_many_active_share_links');
      return original(path, init);
    });
    await render(wrap(<ReceiptScreen />));
    await act(async () => { fireEvent.press(await screen.findByTestId('receipt-link-create')); });
    expect(await screen.findByText(k('receipt.linkLimit'))).toBeTruthy();
  });
});
