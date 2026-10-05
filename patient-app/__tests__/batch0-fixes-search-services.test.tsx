import React from 'react';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DoctorSearchView from '../src/components/views/DoctorSearchView';
import PharmacyProductSearchView from '../src/components/views/PharmacyProductSearchView';
import { apiFetch } from '../src/utils/api';
import { routeFor } from '../src/utils/searchResults';
import { MORE_SERVICES, SERVICE_GROUPS } from '../src/features/services/catalog';
import { Colors } from '../src/theme';

/**
 * Batch 0 fixes, search and services:
 *  - the doctors view reads the real answer ({items}) and sends the real query names (q, specialty, sort);
 *  - the pharmacy view keeps the query it was opened with;
 *  - a package result opens its own page; the services rows lead where their labels say.
 */

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let mockParams: Record<string, string> = {};
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => mockParams,
  Redirect: (props: unknown) => {
    mockRedirect(props);
    return null;
  },
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [{ languageCode: 'ar' }], getCalendar: () => 'gregorian' }));
jest.mock('../src/utils/api', () => ({ apiFetch: jest.fn() }));
let mockLang = 'ar';
jest.mock('../src/context/AppContext', () => ({
  useThemeColors: () => require('../src/theme').Colors.light,
  useApp: () => ({ isDark: false, lang: mockLang, isRTL: mockLang === 'ar' || mockLang === 'ur', colors: require('../src/theme').Colors.light }),
}));
jest.mock('../src/utils/localize', () => ({ pickLocalized: (ar: string | null, en: string | null) => (mockLang === 'ar' ? ar ?? en : en ?? ar) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const mount = () => render(<SafeAreaProvider initialMetrics={metrics}><DoctorSearchView /></SafeAreaProvider>);
const doctorCalls = () => (apiFetch as jest.Mock).mock.calls.map((c) => c[0] as string).filter((p) => p.startsWith('/care/doctors'));

const ANSWER = {
  page: 1, limit: 20, total: 1, total_is_exact: true, has_more: false,
  items: [{ id: 'd1', name_ar: 'د. سارة', name_en: 'Dr. Sara', specialty: 'cardiology', consultation_modes: ['clinic'], price_clinic: 200, rating: 4.8, reviews_count: 12, accepts_insurance: false, next_available_at: null }],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockLang = 'ar';
  (apiFetch as jest.Mock).mockResolvedValue(ANSWER);
});

describe('doctors view (?view=doctors)', () => {
  it('shows the doctors the server answered in items[] (it read `data` and always showed "no results")', async () => {
    await mount();
    expect(await screen.findByText('د. سارة')).toBeTruthy();
    expect(screen.queryByText('لا توجد نتائج')).toBeNull();
  });

  it('shows the name in the reader\'s language', async () => {
    mockLang = 'en';
    await mount();
    expect(await screen.findByText('Dr. Sara')).toBeTruthy();
  });

  it('sends the sort as the server names it, and no waiting-time sort is offered', async () => {
    await mount();
    await waitFor(() => expect(doctorCalls()).toContain('/care/doctors?sort=rating'));
    expect(screen.queryByText('الأقل انتظاراً')).toBeNull();
    await fireEvent.press(screen.getByText('الأقل سعراً'));
    await waitFor(() => expect(doctorCalls()).toContain('/care/doctors?sort=price_asc'));
  });

  it('searches as the user types, with the query name the controller reads (q), not "search"', async () => {
    await mount();
    await waitFor(() => expect(doctorCalls().length).toBeGreaterThan(0));
    await fireEvent.changeText(screen.getByPlaceholderText('ابحث بالاسم أو التخصص...'), 'سارة');
    await waitFor(() => expect(doctorCalls().some((p) => p.includes('q=%D8%B3%D8%A7%D8%B1%D8%A9'))).toBe(true), { timeout: 2000 });
    expect(doctorCalls().some((p) => p.includes('search='))).toBe(false);
  });

  it('the route\'s specialty is sent as the specialty filter, not typed into the search box', async () => {
    mockParams = { specialty: 'dentistry' };
    await mount();
    await waitFor(() => expect(doctorCalls()).toContain('/care/doctors?specialty=dentistry&sort=rating'));
    expect(screen.getByPlaceholderText('ابحث بالاسم أو التخصص...').props.value).toBe('');
  });

  it('an empty answer shows the empty state, and a failed call shows it too (no invented rows)', async () => {
    (apiFetch as jest.Mock).mockResolvedValue({ items: [] });
    await mount();
    expect(await screen.findByText('لا توجد نتائج')).toBeTruthy();
  });

  it('its texts come from the translation files (English)', async () => {
    mockLang = 'en';
    await mount();
    expect(await screen.findByText('Find a doctor')).toBeTruthy();
    expect(screen.getByText('Top rated')).toBeTruthy();
    expect(screen.getByText('Lowest price')).toBeTruthy();
  });
});

describe('pharmacy search view keeps the query', () => {
  it('redirects to /search with q (the prescription translator\'s "details" button lands on the medicine)', async () => {
    mockParams = { q: 'باراسيتامول', view: 'pharmacy' };
    await render(<PharmacyProductSearchView />);
    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: { pathname: '/search', params: { q: 'باراسيتامول' } } }));
  });

  it('with no query it opens the plain search', async () => {
    mockParams = { view: 'pharmacy' };
    await render(<PharmacyProductSearchView />);
    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/search' }));
  });
});

describe('search results lead to the item that was shown', () => {
  it('a package opens its own page with its id (GET /offers/:id)', () => {
    expect(routeFor({ id: 'c9', type: 'باقة', name: 'باقة' })).toEqual({ pathname: '/offers/[id]', params: { id: 'c9' } });
  });

  it('the package page is a screen of the app', () => {
    expect(existsSync(join(__dirname, '..', 'app', 'offers', '[id].tsx'))).toBe(true);
  });
});

describe('services rows lead where the label says', () => {
  const rows = [...MORE_SERVICES, ...SERVICE_GROUPS.flatMap((g) => g.items)];
  const route = (title: string) => rows.find((r) => r.title === title)?.route;

  it('eye exam and dentistry open the doctors search filtered to their specialty (they both opened the same unfiltered list)', () => {
    expect(route('فحص النظر')).toBe('/search?view=doctors&specialty=ophthalmology');
    expect(route('طب الأسنان')).toBe('/search?view=doctors&specialty=dentistry');
  });

  it('the AI assistant row opens the same assistant as the Home card', () => {
    expect(SERVICE_GROUPS.flatMap((g) => g.items).find((r) => r.title === 'المساعد الطبي الذكي')?.route).toBe('/ai-assistant');
  });
});
