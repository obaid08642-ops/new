import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SearchRoute from '../app/search/index';
import { apiFetch } from '../src/utils/api';
import { isOffline } from '../src/utils/isOffline';
import { blocksFor, countByFilter, fromGrouped, routeFor } from '../src/utils/searchResults';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('../src/utils/api', () => ({ apiFetch: jest.fn() }));
jest.mock('../src/utils/isOffline', () => ({ isOffline: jest.fn() }));
jest.mock('../src/utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../src/components/views/PharmacyProductSearchView', () => () => null);
jest.mock('../src/components/views/DoctorSearchView', () => () => null);
let mockLang = 'ar';
jest.mock('../src/context/AppContext', () => ({
  useApp: () => ({ isDark: false, lang: mockLang, isRTL: mockLang === 'ar' || mockLang === 'ur' }),
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const ui = (
  <SafeAreaProvider initialMetrics={metrics}>
    <SearchRoute />
  </SafeAreaProvider>
);

/** Fixtures shaped like the grouped GET /search answer (D-29; fixtures live in the tests only, never in the screen). */
const item = (type: string, id: string, name: string, price: number | null = null, extra: Record<string, unknown> = {}) =>
  ({ id, type, section: null, name, name_locale: 'ar', price, requires_prescription: false, ...extra });
const answer = (en = false) => ({
  query: 'x', engine: 'mongo', groups: [
    { type: 'medicine', items: [
      item('medicine', 'm1', en ? 'Paracetamol 500' : 'باراسيتامول 500', 12),
      item('medicine', 'm2', en ? 'Paracetamol syrup' : 'باراسيتامول شراب', 0),
      item('medicine', 'm3', en ? 'Paracetamol 1000' : 'باراسيتامول 1000'),
      item('medicine', 'm4', en ? 'Paracetamol effervescent' : 'باراسيتامول فوار'),
    ] },
    { type: 'doctor', items: [item('doctor', 'd1', en ? 'Dr. Sara' : 'د. سارة', 200, { specialty: 'internal_medicine' })] },
    { type: 'lab_test', items: [item('lab_test', 'l1', en ? 'CBC' : 'صورة دم', 60)] },
    { type: 'radiology', items: [item('radiology', 'r1', en ? 'Chest X-ray' : 'أشعة صدر', 150)] },
    { type: 'nursing', items: [item('nursing', 'n1', en ? 'Injection at home' : 'حقنة في المنزل', 120)] },
  ],
});
const EMPTY = { query: 'x', engine: 'mongo', groups: [] };
const ROWS = fromGrouped(answer());

const type = async (text: string) => {
  await fireEvent.changeText(screen.getByLabelText('بحث'), text);
};

describe('Search screen (board Search)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockLang = 'ar';
    mockParams = {};
    (isOffline as jest.Mock).mockResolvedValue(false);
    await AsyncStorage.clear();
  });

  it('with no query: browse-by-section grid, no results block, a named search field and the scan button', async () => {
    await render(ui);
    expect(screen.getByText('تصفّح حسب القسم')).toBeTruthy();
    for (const label of ['الصيدلية', 'استشارة', 'تحاليل', 'أشعة', 'تمريض', 'صحة نفسية', 'تغذية', 'العائلة']) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    expect(screen.getByLabelText('بحث')).toBeTruthy();
    expect(screen.getByLabelText('ماسح الأدوية')).toBeTruthy();
    expect(screen.getByLabelText('إلغاء')).toBeTruthy();
    // nothing is invented: no "most searched" block, no recent block, no clear button on an empty field
    expect(screen.queryByText('الأكثر بحثًا')).toBeNull();
    expect(screen.queryByText('عمليات البحث الأخيرة')).toBeNull();
    expect(screen.queryByLabelText('مسح')).toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('recent searches come from the phone: tapping one searches it, "Clear" empties the list', async () => {
    await AsyncStorage.setItem('@nabdah_recent_searches', JSON.stringify(['بنادول', 'فيتامين د']));
    (apiFetch as jest.Mock).mockResolvedValue(EMPTY);
    await render(ui);
    await waitFor(() => expect(screen.getByText('عمليات البحث الأخيرة')).toBeTruthy());
    expect(screen.getByLabelText('بنادول')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('مسح'));
    await waitFor(() => expect(screen.queryByText('عمليات البحث الأخيرة')).toBeNull());
    expect(await AsyncStorage.getItem('@nabdah_recent_searches')).toBeNull();
  });

  it('typing searches after the debounce and draws the results in blocks with counts on the chips', async () => {
    (apiFetch as jest.Mock).mockResolvedValue(answer());
    await render(ui);
    await type('باراسيتامول');
    expect(apiFetch).not.toHaveBeenCalled(); // debounced
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(`/search?q=${encodeURIComponent('باراسيتامول')}&locale=ar&limit=10`), { timeout: 3000 });
    await waitFor(() => expect(screen.getByText('أدوية ومنتجات')).toBeTruthy());
    // blocks of the board (the chips carry the same words, so the titles are found by their heading role)
    expect(screen.getByRole('header', { name: 'أطباء' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'تحاليل وأشعة' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'خدمات تمريض' })).toBeTruthy();
    // chips: only kinds that have results, each with its real count; "All" counts everything
    expect(screen.getByLabelText('الكل 8')).toBeTruthy();
    expect(screen.getByLabelText('أدوية 4')).toBeTruthy();
    expect(screen.getByLabelText('أطباء 1')).toBeTruthy();
    expect(screen.queryByLabelText(/^مقالات/)).toBeNull();
    // medicines preview 3 rows with a "see all (4)" link; a "0" price is not drawn, a real one is
    expect(screen.getByLabelText('الكل (4)')).toBeTruthy();
    expect(screen.queryByText('باراسيتامول فوار')).toBeNull();
    expect(screen.getByLabelText('باراسيتامول 500. 12 ر.س')).toBeTruthy();
    expect(screen.getByLabelText('باراسيتامول شراب')).toBeTruthy();
    // nothing is promoted: no ad marker (decision 29)
    expect(screen.queryByText('إعلان')).toBeNull();
    // the upload card is the board's last block
    expect(screen.getByText('رفع الوصفة')).toBeTruthy();
    // the search is remembered
    await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem('@nabdah_recent_searches')) ?? '[]')).toContain('باراسيتامول'));
  });

  it('a chip filters, "see all" jumps to the kind, and a result opens its real route', async () => {
    (apiFetch as jest.Mock).mockResolvedValue(answer());
    mockParams = { q: 'باراسيتامول' };
    await render(ui);
    await waitFor(() => expect(screen.getByText('أدوية ومنتجات')).toBeTruthy(), { timeout: 3000 });
    await fireEvent.press(screen.getByLabelText('الكل (4)'));
    expect(screen.getByLabelText('أدوية 4').props.accessibilityState.selected).toBe(true);
    expect(screen.queryByLabelText('د. سارة. 200 ر.س')).toBeNull(); // the doctors block is gone
    expect(screen.queryByText('تحاليل وأشعة')).toBeNull();
    expect(screen.getByLabelText('باراسيتامول فوار')).toBeTruthy(); // all four now
    await fireEvent.press(screen.getByLabelText('باراسيتامول 500. 12 ر.س'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/pharmacy/product-detail', params: { id: 'm1' } });
  });

  it('English reads the English fields and translates the labels', async () => {
    mockLang = 'en';
    (apiFetch as jest.Mock).mockResolvedValue(answer(true));
    mockParams = { q: 'para' };
    await render(ui);
    await waitFor(() => expect(screen.getByText('Medicines and products')).toBeTruthy(), { timeout: 3000 });
    expect(screen.getByLabelText('Paracetamol 500. 12 SAR')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/search?q=para&locale=en&limit=10');
    expect(screen.getByLabelText('Search')).toBeTruthy();
  });

  it('no results: an empty state and the prescription upload, never a blank page', async () => {
    (apiFetch as jest.Mock).mockResolvedValue(EMPTY);
    mockParams = { q: 'xyz' };
    await render(ui);
    await waitFor(() => expect(screen.getByText('لا توجد نتائج')).toBeTruthy(), { timeout: 3000 });
    expect(screen.getByText('رفع الوصفة')).toBeTruthy();
    await fireEvent.press(screen.getByText('رفع الوصفة'));
    expect(mockRouter.push).toHaveBeenCalledWith('/pharmacy/rx-order?via=photo');
  });

  it('a failed search shows the error state with a retry that searches again', async () => {
    (apiFetch as jest.Mock).mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(answer());
    mockParams = { q: 'باراسيتامول' };
    await render(ui);
    await waitFor(() => expect(screen.getByText('تعذر تنفيذ البحث')).toBeTruthy(), { timeout: 3000 });
    expect(screen.queryByText('boom')).toBeNull(); // no technical wording
    await fireEvent.press(screen.getByText('إعادة المحاولة'));
    await waitFor(() => expect(screen.getByText('أدوية ومنتجات')).toBeTruthy(), { timeout: 3000 });
  });

  it('with no connection it says so instead of "error"', async () => {
    (isOffline as jest.Mock).mockResolvedValue(true);
    (apiFetch as jest.Mock).mockRejectedValue(new Error('Network request failed'));
    mockParams = { q: 'باراسيتامول' };
    await render(ui);
    await waitFor(() => expect(screen.getByText('لا يوجد اتصال بالإنترنت')).toBeTruthy(), { timeout: 3000 });
  });

  it('Cancel goes back', async () => {
    await render(ui);
    await fireEvent.press(screen.getByLabelText('إلغاء'));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});

describe('search result rules', () => {
  it('counts per chip, blocks per chip, and the routes of every kind', () => {
    const counts = countByFilter(ROWS);
    expect(counts).toMatchObject({ all: 8, meds: 4, doctors: 1, labs: 1, radiology: 1, nursing: 1 });
    expect(blocksFor(ROWS, 'all').map((b) => b.section.key)).toEqual(['meds', 'doctors', 'tests', 'nursing']);
    expect(blocksFor(ROWS, 'radiology').map((b) => b.section.key)).toEqual(['tests']);
    expect(blocksFor(ROWS, 'radiology')[0].rows).toHaveLength(1);
    expect(routeFor({ id: 'x', type: 'دكتور' })).toBe('/consultations/doctor/x');
    expect(routeFor({ id: 'cardiology', type: 'تخصص' })).toEqual({ pathname: '/search', params: { view: 'doctors', specialty: 'cardiology' } });
    expect(routeFor({ id: 'n1', type: 'تمريض' })).toEqual({ pathname: '/nursing/service-details', params: { serviceId: 'n1' } });
    expect(routeFor({ id: 'x', type: 'أشعة' })).toEqual({ pathname: '/diagnostics/test-detail', params: { id: 'x', type: 'radiology' } });
    expect(routeFor({ id: 'x', slug: 's', type: 'مقال' })).toBe('/articles/s');
    expect(routeFor({ type: 'دواء' })).toBeNull();
  });
});

describe('grouped answer (D-29)', () => {
  it('maps the API types to the page kinds, opens a specialty by its code and an article by its slug, and drops unknown rows', () => {
    const rows = fromGrouped({ groups: [
      { type: 'specialty', items: [{ id: 'spec-cardiology', type: 'specialty', name: 'القلب', code: 'cardiology' }] },
      { type: 'article', items: [{ id: 'a-uuid', type: 'article', name: 'الحمى', slug: 'fever' }] },
      { type: 'lab_package', items: [{ id: 'pkg', type: 'lab_package', name: 'باقة', price: 400 }] },
      { type: 'other', items: [{ id: 'x', type: 'other', name: 'x' }] },
    ] });
    expect(rows.map((r) => [r.type, r.id])).toEqual([['تخصص', 'cardiology'], ['مقال', 'a-uuid'], ['تحليل', 'pkg']]);
    expect(routeFor(rows[1])).toBe('/articles/fever');
    expect(rows[2].price).toBe('400');
    expect(fromGrouped(null)).toEqual([]);
    expect(fromGrouped([])).toEqual([]);
  });
});
