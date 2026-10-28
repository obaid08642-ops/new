import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DiagnosticsHub from '../../../app/(tabs)/diagnostics';
import ServiceHome from '../../../app/diagnostics/service-home';
import { NotifyMeButton, OffersSection } from '../../components/diagnostics/CatalogueKit';
import { NursingServiceList } from '../../components/nursing/NursingServiceList';
import { formatNumber, message } from '../../components/screen/ScreenKit';
import { offerLines, offerSummaryOf, offersOf, providersText } from '../../utils/catalogueOffers';
import { serveCatalog } from './catalogServer';

/** #2067: the catalogue is the single source. Lists carry providers_count / from_price / where / insurance, details carry the offers, a service nobody offers is listed and can be asked for. TEST values. */

jest.setTimeout(30000);
const mockApi = jest.fn();
const mockPush = jest.fn();
const mockHasSession = jest.fn(async () => true);
let mockTab: string | undefined = 'radiology';
let mockKind: string | undefined = 'radiology';
let mockLang = 'en';
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({ tab: mockTab, kind: mockKind }),
  useFocusEffect: () => undefined,
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: mockLang, isRTL: mockLang === 'ar' || mockLang === 'ur' }) }));
jest.mock('../../context/CartContext', () => ({ useCart: () => ({ itemCount: 0 }) }));
jest.mock('../../context/DiagnosticsCartContext', () => ({
  useDiagnosticsCart: () => ({ items: [], itemCount: 0, total: 0, addItem: jest.fn(), removeItem: jest.fn() }),
}));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/api', () => ({
  apiFetch: (...a: unknown[]) => mockApi(...a),
  hasSession: () => mockHasSession(),
  BASE_URL: 'https://api.example.test/api/v1',
  R2_PUBLIC_URL: 'https://cdn.example.test',
}));
jest.mock('../../utils/useOrderingContext', () => ({ useOrderingContext: () => ({ status: 'ready', choice: { mode: 'home', payer: 'cash' }, body: null }) }));
jest.mock('../../components/ordering/OrderingKit', () => ({ ContextGate: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('../../components/ordering/ContextBar', () => ({ ContextBar: () => null }));

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (node: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{node}</SafeAreaProvider>;

const SERVED = { id: 'r-served', name_en: 'Test chest scan', modality: 'xray', category: 'xray', price: 90, home_visit_supported: false, popularity: 9, providers_count: 3, from_price: 120, premises_available: true, home_available: true, insurance_accepted: true };
const NONE = { id: 'r-none', name_en: 'Test cardiac scan', modality: 'mri', category: 'mri', home_visit_supported: false, popularity: 1, providers_count: 0, from_price: null, premises_available: false, home_available: false, insurance_accepted: false };

beforeEach(() => {
  mockApi.mockReset();
  mockPush.mockReset();
  mockHasSession.mockReset().mockResolvedValue(true);
  mockLang = 'en';
  mockTab = 'radiology';
  mockKind = 'radiology';
  mockApi.mockImplementation(async (path: string) => {
    if (path === '/home-care/services') return [];
    return serveCatalog(path, { scans: [SERVED, NONE] });
  });
});

describe('the offer fields of the catalogue payload', () => {
  it('reads the summary and the offers, nothing from an older answer, and ignores nonsense', () => {
    expect(offerSummaryOf(SERVED)).toEqual({ providersCount: 3, fromPrice: 120, premises: true, home: true, insurance: true });
    expect(offerSummaryOf(NONE)).toEqual({ providersCount: 0, fromPrice: null, premises: false, home: false, insurance: false });
    expect(offerSummaryOf({ id: 'old', name_en: 'Old' })).toBeNull();
    expect(offerSummaryOf({ providers_count: -1 })).toBeNull();
    const offers = offersOf({ offers: [{ provider: { id: 'p1', name_en: 'Alpha', rating: 4.5, rating_count: 12 }, price: 120, premises: true, insurance: true }, { provider: { id: 'p2', name_ar: 'بيتا' }, price: null }, { provider: {} }, 'x'] });
    expect(offers.map((o) => [o.providerId, o.price, o.premises, o.insurance])).toEqual([['p1', 120, true, true], ['p2', null, false, false]]);
  });

  it('writes the count in the language: Arabic one/two/many, Bengali digits, "from" only when someone priced it', () => {
    const ui = (lang: string) => ({ k: (key: string, vars?: Record<string, string | number>) => message(lang, key, vars), num: (n: number) => formatNumber(n, lang), money: (n: number) => formatNumber(n, lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), lang });
    const ar = ui('ar');
    expect(providersText(ar.k, ar.num, 'ar', 1, false)).toBe(message('ar', 'diag.offer.countOne'));
    expect(providersText(ar.k, ar.num, 'ar', 2, false)).toBe(message('ar', 'diag.offer.countTwo'));
    expect(providersText(ar.k, ar.num, 'ar', 7, false)).toBe(message('ar', 'diag.offer.count', { n: '7' }));
    const bn = ui('bn');
    expect(providersText(bn.k, bn.num, 'bn', 12, false)).toContain('১২');
    expect(offerLines(offerSummaryOf(SERVED), ui('en'))).toMatchObject({ providers: '3 centres', none: false, from: 'From 120.00 SAR', where: ['At the centre', 'At home', 'Insurance accepted'] });
    expect(offerLines(offerSummaryOf({ providers_count: 2, from_price: null }), ui('en'))).toMatchObject({ providers: '2 centres', from: undefined });
    expect(offerLines(offerSummaryOf(NONE), ui('en'))).toMatchObject({ providers: 'No centre offers this yet', none: true, where: [] });
    expect(offerLines(null, ui('en'))).toBeNull();
    expect(providersText(ui('en').k, ui('en').num, 'en', 1, true)).toBe('1 provider');
  });
});

describe('one list, every entry point', () => {
  const expectCards = async (idPrefix: string) => {
    await waitFor(() => expect(screen.getByTestId(`${idPrefix}-r-served`)).toBeTruthy(), { timeout: 15000 });
    expect(screen.getAllByText(/3 centres/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/From 120\.00 SAR/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('At the centre').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Insurance accepted').length).toBeGreaterThan(0);
    // the scan nobody offers is listed with the reason, even though the order's place is "home" and it cannot be done at home
    expect(screen.getByTestId(`${idPrefix}-r-none`)).toBeTruthy();
    expect(screen.getAllByText(/No centre offers this yet/).length).toBeGreaterThan(0);
  };

  it("the hub's radiology tab lists every scan with its offer lines", async () => {
    await render(wrap(<DiagnosticsHub />));
    await expectCards('diag-scan');
    expect(mockApi.mock.calls.some(([path]) => String(path).startsWith('/radiology/services?page=1&limit=20'))).toBe(true);
  });

  it('the radiology service home draws the same cards from the same paged catalogue, with no second fetch of the whole list', async () => {
    mockTab = undefined;
    await render(wrap(<ServiceHome />));
    await expectCards('ordering-item');
    // the public-list cache may have answered (the hub test read the same page): either way the whole list is never fetched in one go
    for (const [path] of mockApi.mock.calls) expect(String(path)).not.toBe('/radiology/services');
    for (const [path] of mockApi.mock.calls.filter(([p]) => String(p).startsWith('/radiology/services'))) expect(String(path)).toMatch(/^\/radiology\/services\?page=1&limit=20/);
  });

  it('the nursing list keeps the service nobody offers and shows the others with providers and from-price', async () => {
    const services = [
      { id: 'svc-a', name_en: 'Wound care', price: 200, providers_count: 4, from_price: 180, premises_available: false, home_available: true, insurance_accepted: true },
      { id: 'svc-b', name_en: 'IV drip', price: 150, providers_count: 0, from_price: null, premises_available: false, home_available: false, insurance_accepted: false },
    ];
    await render(wrap(<NursingServiceList services={services} actionLabel="Book" onOpen={jest.fn()} onBook={jest.fn()} />));
    expect(screen.getByTestId('nursing-service-svc-a')).toBeTruthy();
    expect(screen.getByText(/4 providers · From 180\.00 SAR · At home · Insurance accepted/)).toBeTruthy();
    expect(screen.getByTestId('nursing-service-svc-b')).toBeTruthy();
    expect(screen.getByText('No centre offers this yet')).toBeTruthy();
  });
});

describe('the detail: who offers it, and "Notify me when available"', () => {
  it('lists the offers cheapest first', async () => {
    const offers = offersOf({ offers: [
      { provider: { id: 'p1', name_en: 'Alpha Imaging', rating: 4.5, rating_count: 12 }, price: 120, premises: true, insurance: true },
      { provider: { id: 'p2', name_en: 'Beta Scan' }, price: 150, premises: true, home: true },
      { provider: { id: 'p3', name_en: 'Gamma Centre' }, price: null, premises: true },
    ] });
    await render(wrap(<OffersSection kind="radiology" serviceId="r-served" offer={offerSummaryOf(SERVED)} offers={offers} />));
    expect(screen.getByText(k('diag.offer.title'))).toBeTruthy();
    const labels = screen.getAllByText(/Alpha Imaging|Beta Scan|Gamma Centre/).map((n) => n.props.children);
    expect(labels).toEqual(['Alpha Imaging', 'Beta Scan', 'Gamma Centre']);
    expect(screen.getByText(k('diag.offer.noPrice') + ' · ' + k('diag.offer.atCentre'))).toBeTruthy();
    expect(screen.queryByTestId('notify-me')).toBeNull();
  });

  it('a service nobody offers says so and registers the interest once, then shows the confirmation', async () => {
    mockApi.mockImplementation(async (path: string, init?: { method?: string; body?: string }) => {
      if (path === '/catalogue-interest/mine') return [];
      if (path === '/catalogue-interest' && init?.method === 'POST') return { ok: true, interested: true, providers_count: 0 };
      return null;
    });
    await render(wrap(<OffersSection kind="radiology" serviceId="r-none" offer={offerSummaryOf(NONE)} offers={[]} />));
    expect(screen.getByText(k('diag.offer.none'))).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('notify-me')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('notify-me'));
    await waitFor(() => expect(screen.getByTestId('notify-me-done')).toBeTruthy());
    const post = mockApi.mock.calls.find(([path, init]) => path === '/catalogue-interest' && init?.method === 'POST');
    expect(JSON.parse(post![1].body)).toEqual({ service_type: 'radiology', service_id: 'r-none' });
    expect(screen.queryByTestId('notify-me')).toBeNull();
  });

  it('shows the confirmation at once when the patient already asked (idempotent)', async () => {
    mockApi.mockImplementation(async (path: string) => (path === '/catalogue-interest/mine' ? [{ service_type: 'lab', service_id: 'rare', created_at: 'x', notified_at: null }] : null));
    await render(wrap(<NotifyMeButton kind="lab" serviceId="rare" />));
    await waitFor(() => expect(screen.getByTestId('notify-me-done')).toBeTruthy());
    expect(screen.queryByTestId('notify-me')).toBeNull();
  });

  it('keeps the button and says so when saving fails', async () => {
    mockApi.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path === '/catalogue-interest/mine') return [];
      if (init?.method === 'POST') throw new Error('api_error');
      return null;
    });
    await render(wrap(<NotifyMeButton kind="lab" serviceId="other" />));
    await waitFor(() => expect(screen.getByTestId('notify-me')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('notify-me'));
    await waitFor(() => expect(screen.getByText(k('diag.offer.notifyFailed'))).toBeTruthy());
    expect(screen.queryByTestId('notify-me-done')).toBeNull();
  });

  it('without a session the button is the normal sign-in', async () => {
    mockHasSession.mockResolvedValue(false);
    await render(wrap(<NotifyMeButton kind="nursing" serviceId="svc-b" />));
    await waitFor(() => expect(screen.getByTestId('notify-me-signin')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('notify-me-signin'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
    expect(mockApi).not.toHaveBeenCalled();
  });

  it('draws nothing for an older answer with no summary', async () => {
    await render(wrap(<OffersSection kind="lab" serviceId="x" offer={null} offers={[]} />));
    expect(screen.queryByText(k('diag.offer.none'))).toBeNull();
    expect(screen.queryByText(k('diag.offer.title'))).toBeNull();
    expect(screen.queryByTestId('notify-me')).toBeNull();
  });
});
