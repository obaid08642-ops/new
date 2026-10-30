import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SPECIALTY_ART_SLUGS, SPECIALTY_ART_BY_SLUG } from '../../packages/ui/icons/specialty-art';
import { specialtyNameKey, specialtyTileModels, type SpecialtyRow as Row } from '../src/utils/consultSpecialties';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
const mockFetchPublicList = jest.fn();
jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockRouter.push(...a), replace: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('../src/utils/publicCache', () => ({ fetchPublicList: (...a: unknown[]) => mockFetchPublicList(...a) }));
jest.mock('../src/utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../src/utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../src/context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));

import { SpecialtyRow } from '../src/components/consult/SpecialtyTiles';
import SpecialtySelectScreen from '../app/consultations/specialty-select';
import en from '../src/i18n/locales/en.json';

const rows: Row[] = [
  { slug: 'dermatology', name_ar: 'جلدية', name_en: 'Dermatology', count: 0 },
  { slug: 'cardiology', name_ar: 'قلب', name_en: 'Cardiology', count: 9 },
  { slug: 'family_medicine', name_ar: 'طب الأسرة', name_en: 'Family Medicine', count: 3 },
  { slug: 'pediatrics', name_ar: 'أطفال', name_en: 'Pediatrics', count: 14 },
];
const nameOf = (slug: string, ar?: string, e?: string) => (specialtyNameKey(slug) ? (en as Record<string, string>)[specialtyNameKey(slug) as string] : e || ar || '');

describe('specialty tiles (app)', () => {
  it('every backend slug has an app name message and an illustration or the explicit fallback', () => {
    for (const slug of SPECIALTY_ART_SLUGS) {
      expect(SPECIALTY_ART_BY_SLUG[slug]).toBeTruthy();
      expect((en as Record<string, string>)[specialtyNameKey(slug) as string]).toBeTruthy();
    }
  });

  it('orders with doctors first by most doctors, then the coming-soon ones', () => {
    const tiles = specialtyTileModels(rows, nameOf);
    expect(tiles.map((t) => t.slug)).toEqual(['pediatrics', 'cardiology', 'family_medicine', 'dermatology']);
    expect(tiles.map((t) => t.comingSoon)).toEqual([false, false, false, true]);
  });

  it('the row: All first, All specialties last, selection and taps; a fallback specialty still draws a picture', async () => {
    const tiles = specialtyTileModels(rows, nameOf);
    const onAll = jest.fn();
    const onSelect = jest.fn();
    const onMore = jest.fn();
    await render(<SpecialtyRow tiles={tiles} arabicNames={{ family_medicine: 'طب الأسرة' }} allLabel="All" moreLabel="All specialties" comingSoonLabel="Coming soon" activeSlug="cardiology" onAll={onAll} onSelect={onSelect} onMore={onMore} />);
    const ids = screen.getAllByTestId(/^specialty-tile-/).map((n) => n.props.testID);
    expect(ids).toEqual(['specialty-tile-all', 'specialty-tile-pediatrics', 'specialty-tile-cardiology', 'specialty-tile-family_medicine', 'specialty-tile-dermatology', 'specialty-tile-more']);
    expect(screen.getByLabelText('Cardiology').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByLabelText('Dermatology, Coming soon')).toBeTruthy();
    expect(screen.getByTestId('specialty-art-cardiology', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByTestId('specialty-art-internal', { includeHiddenElements: true })).toBeNull();
    // 6 tiles, 5 illustrated: the specialty with no illustration (family medicine) draws its fill icon instead, so it is not blank
    expect(screen.getAllByTestId(/^specialty-art-/, { includeHiddenElements: true })).toHaveLength(5);
    await fireEvent.press(screen.getByLabelText('Cardiology'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ slug: 'cardiology' }));
    await fireEvent.press(screen.getByLabelText('Dermatology, Coming soon'));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ slug: 'dermatology', comingSoon: true }));
    await fireEvent.press(screen.getByLabelText('All'));
    await fireEvent.press(screen.getByLabelText('All specialties'));
    expect(onAll).toHaveBeenCalled();
    expect(onMore).toHaveBeenCalled();
  });

  it('the grid screen searches by name, opens the doctor search for a specialty and shows Coming soon for one without doctors', async () => {
    mockFetchPublicList.mockResolvedValue(rows);
    await render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } }}><SpecialtySelectScreen /></SafeAreaProvider>);
    await waitFor(() => expect(screen.getByLabelText('Cardiology')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('Cardiology'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/consultations/doctor-search', params: { specialty: 'قلب' } });
    await fireEvent.press(screen.getByLabelText('Dermatology, Coming soon'));
    expect(screen.getByTestId('specialty-soon-note')).toBeTruthy();
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    await fireEvent.changeText(screen.getByTestId('specialty-search'), 'قلب');
    await waitFor(() => expect(screen.queryByLabelText('Pediatrics')).toBeNull());
    expect(screen.getByLabelText('Cardiology')).toBeTruthy();
  });
});
