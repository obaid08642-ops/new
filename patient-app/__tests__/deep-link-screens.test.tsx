import fs from 'fs';
import path from 'path';
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * The screens a shared link lands on (/p, /medicine, /doctor, /facility, /s/:type, and the unknown route). The REAL
 * screens render; only the router, the request and the language are replaced.
 *
 * Walkthrough defects covered: the unknown-route screen and the "opening" text were Arabic in every language, used
 * raw colours, and a link that no longer exists dropped the patient on an unrelated list (or, for a facility, on the
 * list of specialties) without a word.
 */
let mockLang = 'en';
let mockParams: Record<string, string> = {};
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
const mockApiFetch = jest.fn();
jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.mock('../src/utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a) }));
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('../src/context/AppContext', () => ({
  useApp: () => ({ isDark: false, lang: mockLang, isRTL: mockLang === 'ar' || mockLang === 'ur' }),
}));

import NotFound from '../app/+not-found';
import MedicineLink from '../app/p/[slug]';
import DoctorLink from '../app/doctor/[slug]';
import FacilityLink from '../app/facility/[slug]';
import PublicLink from '../app/s/[type]/[slug]';

const EN = require('../src/i18n/locales/en.json') as Record<string, string>;
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const show = async (ui: React.ReactElement) => {
  await render(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);
};
const texts = () => JSON.stringify(screen.toJSON());
const ARABIC = /[؀-ۿ]/;

beforeEach(() => {
  jest.clearAllMocks();
  mockLang = 'en';
  mockParams = {};
});

describe('the unknown route', () => {
  it('speaks the patient language, not Arabic, and offers search and home', async () => {
    await show(<NotFound />);
    expect(await screen.findByText(EN['link.notFound.title'])).toBeTruthy();
    expect(texts()).not.toMatch(ARABIC);
  });

  it.each([['ar', 'ar'], ['ur', 'ur'], ['hi', 'hi'], ['bn', 'bn'], ['fil', 'tl']])('is translated in %s', async (lang, file) => {
    mockLang = lang;
    const messages = require(`../src/i18n/locales/${file}.json`) as Record<string, string>;
    await show(<NotFound />);

    expect(await screen.findByText(messages['link.notFound.title'])).toBeTruthy();
    expect(messages['link.notFound.title']).not.toBe(EN['link.notFound.title']);
  });
});

describe('a shared link', () => {
  it('shows what is being opened in the patient language while it resolves', async () => {
    mockParams = { slug: 'panadol' };
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    await show(<MedicineLink />);
    expect(screen.getByText(EN['link.opening.medicine'])).toBeTruthy();
    expect(texts()).not.toMatch(ARABIC);
  });

  it('opens the product page of a medicine link', async () => {
    mockParams = { slug: 'panadol' };
    mockApiFetch.mockResolvedValue({ entity: { id: 'm-1' } });
    await show(<MedicineLink />);
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/pharmacy/product-detail', params: { id: 'm-1' } }));
  });

  it('says so when the medicine link no longer exists, instead of opening a product from the raw slug', async () => {
    mockParams = { slug: 'gone' };
    mockApiFetch.mockResolvedValue({ entity: null });
    await show(<MedicineLink />);
    expect(await screen.findByText(EN['link.notFound.title'])).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('says so when the doctor link is a 404, instead of dropping the patient on the doctor search', async () => {
    mockParams = { slug: 'dr-gone' };
    mockApiFetch.mockRejectedValue(new Error('404'));
    await show(<DoctorLink />);
    expect(await screen.findByText(EN['link.notFound.title'])).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('says so when the facility link is a 404, instead of opening the list of specialties', async () => {
    mockParams = { slug: 'clinic-gone' };
    mockApiFetch.mockRejectedValue(new Error('404'));
    await show(<FacilityLink />);
    expect(await screen.findByText(EN['link.notFound.title'])).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('forwards a public SEO link to the screen of its type and refuses an unknown type without a request', async () => {
    mockParams = { type: 'doctor', slug: 'dr-a' };
    mockApiFetch.mockResolvedValue({ id: 'd-9' });
    const first = await render(<SafeAreaProvider initialMetrics={metrics}><PublicLink /></SafeAreaProvider>);
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/consultations/doctor-profile', params: { id: 'd-9' } }));
    await act(async () => { first.unmount(); });

    mockApiFetch.mockClear();
    mockParams = { type: 'nonsense', slug: 'x' };
    await show(<PublicLink />);
    expect(await screen.findByText(EN['link.notFound.title'])).toBeTruthy();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});

describe('the source of these screens', () => {
  const files = ['app/+not-found.tsx', 'app/p/[slug].tsx', 'app/medicine/[slug].tsx', 'app/doctor/[slug].tsx', 'app/facility/[slug].tsx', 'app/s/[type]/[slug].tsx', 'src/components/LinkCatcher.tsx'];
  it.each(files)('%s has no raw colour, no Arabic literal and no ts-nocheck', (file) => {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    expect(source).not.toMatch(/#[0-9A-Fa-f]{6}\b/);
    expect(source).not.toMatch(ARABIC);
    expect(source).not.toMatch(/@ts-nocheck/);
  });
});

describe('the ways out of the not-found state', () => {
  // last on purpose: pressing a button leaves the shared test renderer busy for the tests that follow
  it('search and home are real destinations', async () => {
    await show(<NotFound />);
    fireEvent.press(await screen.findByText(EN['link.search']));
    expect(mockRouter.replace).toHaveBeenCalledWith('/search');
    fireEvent.press(screen.getByText(EN['link.home']));
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });
});
