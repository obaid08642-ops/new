import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { FieldText, LocalizedField, nameProps } from '../components/LocalizedField';
import { PackageCard, TestRow } from '../components/diagnostics/DiagKit';
import { message } from '../components/screen/ScreenKit';
import { normalizeLabService } from '../utils/labMappers';
import ar from '../i18n/locales/ar.json';
import en from '../i18n/locales/en.json';
import ur from '../i18n/locales/ur.json';
import hi from '../i18n/locales/hi.json';
import bn from '../i18n/locales/bn.json';
import tl from '../i18n/locales/tl.json';

let mockLang = 'ar';
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: mockLang, isRTL: mockLang === 'ar' || mockLang === 'ur' }) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../utils/localize', () => ({ ...jest.requireActual('../utils/localize'), currentDbLang: () => (mockLang === 'fil' ? 'tl' : mockLang) }));

const style = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;

describe('LocalizedField', () => {
  it('Arabic page, English-only text: shown, left-to-right, with the note', async () => {
    mockLang = 'ar';
    await render(<LocalizedField en="Panadol" testID="f" />);
    const text = screen.getByTestId('f');
    expect(text.props.children).toBe('Panadol');
    expect(style(text)).toMatchObject({ writingDirection: 'ltr', textAlign: 'left' });
    expect(text.props.accessibilityLanguage).toBe('en');
    expect(screen.getByTestId('language-fallback-note').props.numberOfLines).toBe(1);
    expect(screen.getByText('متاح بالإنجليزية فقط')).toBeTruthy();
  });
  it('English page, Arabic-only text: right-to-left with "Available in Arabic only"', async () => {
    mockLang = 'en';
    await render(<LocalizedField ar="بنادول" testID="f" />);
    expect(style(screen.getByTestId('f'))).toMatchObject({ writingDirection: 'rtl', textAlign: 'right' });
    expect(screen.getByText('Available in Arabic only')).toBeTruthy();
  });
  it('a text in the page language has no note and no override; note={false} drops the note', async () => {
    mockLang = 'ar';
    await render(<LocalizedField ar="بنادول" en="Panadol" testID="f" />);
    expect(screen.queryByTestId('language-fallback-note')).toBeNull();
    expect(screen.getByTestId('f').props.accessibilityLanguage).toBeUndefined();
  });
  it('ur page prefers English and needs no note for an ar/en field', async () => {
    mockLang = 'ur';
    await render(<LocalizedField ar="بنادول" en="Panadol" testID="f" />);
    expect(style(screen.getByTestId('f'))).toMatchObject({ writingDirection: 'ltr' });
    expect(screen.queryByTestId('language-fallback-note')).toBeNull();
  });
  it('FieldText draws nothing for an empty text', async () => {
    await render(<FieldText text="" testID="f" />);
    expect(screen.queryByTestId('f')).toBeNull();
  });
});

describe('cards keep the mark', () => {
  it('TestRow with an English-only name on an Arabic page shows it with the note', async () => {
    mockLang = 'ar';
    const item = normalizeLabService({ id: '1', name_en: 'CBC', price: 40 });
    expect(item).toMatchObject({ name: 'CBC', nameMark: { lang: 'en', fallbackFrom: 'en' } });
    await render(<TestRow name={item!.name} nameMark={item!.nameMark} price={40} />);
    expect(screen.getByText('CBC')).toBeTruthy();
    expect(screen.getByText('متاح بالإنجليزية فقط')).toBeTruthy();
  });
  it('PackageCard: name note shown, description keeps its direction without a second note', async () => {
    mockLang = 'en';
    const item = normalizeLabService({ id: '2', name_ar: 'باقة', description_ar: 'وصف الباقة' });
    await render(<PackageCard name={item!.name} nameMark={item!.nameMark} desc={item!.desc} descMark={item!.descMark} price={10} icon="drop" tone="coral" actionLabel="Go" onPress={jest.fn()} />);
    expect(screen.getAllByText('Available in Arabic only')).toHaveLength(1);
    expect(screen.getByText('وصف الباقة')).toBeTruthy();
  });
  it('a lab preparation falls back as a whole and is the description when there is no other text', () => {
    mockLang = 'ar';
    const item = normalizeLabService({ id: '3', name_ar: 'تحليل', preparation_en: ['Fast 8 hours', 'Water is fine'] });
    expect(item).toMatchObject({ preparation: ['Fast 8 hours', 'Water is fine'], prepMark: { lang: 'en', fallbackFrom: 'en' }, desc: 'Fast 8 hours, Water is fine', descMark: { lang: 'en' } });
  });
  it('nameProps feeds ui-native cards the direction, language and translated note', () => {
    const k = (key: string) => message('en', key);
    expect(nameProps({ lang: 'ar', dir: 'rtl', fallbackFrom: 'ar' }, k)).toEqual({ nameLang: 'ar', nameDir: 'rtl', nameNote: 'Available in Arabic only' });
    expect(nameProps(undefined, k)).toEqual({});
  });
});

describe('the two note keys exist, translated, in all six locales', () => {
  it.each([['ar', ar], ['en', en], ['ur', ur], ['hi', hi], ['bn', bn], ['tl', tl]] as const)('%s', (l, m) => {
    const d = m as Record<string, string>;
    expect(d['common.availableInEnglishOnly']?.trim()).toBeTruthy();
    expect(d['common.availableInArabicOnly']?.trim()).toBeTruthy();
    if (l !== 'en') {
      expect(d['common.availableInEnglishOnly']).not.toBe((en as Record<string, string>)['common.availableInEnglishOnly']);
      expect(d['common.availableInArabicOnly']).not.toBe((en as Record<string, string>)['common.availableInArabicOnly']);
    }
  });
});
