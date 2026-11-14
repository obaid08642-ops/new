/**
 * Language fallback (owner 2026-10-30, replaces the 2026-10-27 "own language or nothing" rule): a catalogue field is never hidden for
 * lacking the app's language. These tests cover the row adapter (rowField / rowList) and the pharmacy helpers built on it.
 */
let mockLocale = 'ar';
jest.mock('../i18n/LanguageManager', () => ({ LanguageManager: { getInstance: () => ({ i18n: { get locale() { return mockLocale; } } }) } }));

import { dbLangDir } from '../utils/localize';
import { medFieldMark, medListMark, medName, medNameField } from '../utils/pharmacyCatalog';
import { rowField, rowList } from '../utils/rowField';

const med = {
  id: '1',
  name_ar: 'بنادول', name_en: 'Panadol',
  indications_ar: '', indications_en: 'Pain relief',
  description_ar: 'وصف عربي', description_en: 'English description',
  warnings_ar: 'تحذير',
  dosage_ar: 'Adults: one tablet every eight hours with water',
  side_effects_en: ['Nausea', 'Rash'],
  translations: { hi: { description: 'हिंदी विवरण' } },
  strength: '500 مجم',
};

describe('rowField: shown in the app language, else the other language with a mark', () => {
  it('Arabic: own text unmarked; English-only text is shown with the "English only" mark', () => {
    mockLocale = 'ar';
    expect(rowField(med, 'description')).toEqual({ text: 'وصف عربي', mark: undefined });
    expect(rowField(med, 'indications')).toEqual({ text: 'Pain relief', mark: { lang: 'en', dir: 'ltr', fallbackFrom: 'en' } });
  });
  it('an English text sitting in the Arabic column is English (shown with its own direction)', () => {
    mockLocale = 'ar';
    expect(rowField(med, 'dosage').mark).toMatchObject({ lang: 'en', dir: 'ltr' });
  });
  it('English: Arabic-only text is shown with the "Arabic only" mark', () => {
    mockLocale = 'en';
    expect(rowField(med, 'description').mark).toBeUndefined();
    expect(rowField(med, 'warnings')).toEqual({ text: 'تحذير', mark: { lang: 'ar', dir: 'rtl', fallbackFrom: 'ar' } });
  });
  it('Hindi: own text, else a labelled English, else a labelled Arabic; a name (ar/en only) needs no note in English', () => {
    mockLocale = 'hi';
    expect(rowField(med, 'description')).toEqual({ text: 'हिंदी विवरण', mark: undefined });
    expect(rowField(med, 'indications').mark).toEqual({ lang: 'en', dir: 'ltr', fallbackFrom: 'en' });
    expect(rowField(med, 'warnings').mark).toEqual({ lang: 'ar', dir: 'rtl', fallbackFrom: 'ar' });
    expect(rowField(med, 'name')).toEqual({ text: 'Panadol', mark: { lang: 'en', dir: 'ltr', fallbackFrom: null } });
  });
  it('nothing stored: no text, nothing drawn', () => {
    mockLocale = 'en';
    expect(rowField(med, 'side_effects')).toEqual({ text: '', mark: undefined });
    expect(rowField(null, 'x')).toEqual({ text: '' });
  });
  it('a plain column counts as one more candidate (an Arabic root column on an English page is a labelled fallback)', () => {
    mockLocale = 'en';
    expect(rowField(med, 'strength')).toEqual({ text: '500 مجم', mark: { lang: 'ar', dir: 'rtl', fallbackFrom: 'ar' } });
    mockLocale = 'ar';
    expect(rowField(med, 'strength').mark).toBeUndefined();
  });
});

describe('rowList and the pharmacy helpers', () => {
  it('a list is one language as a whole', () => {
    mockLocale = 'ar';
    expect(rowList(med, 'side_effects')).toMatchObject({ items: ['Nausea', 'Rash'], mark: { lang: 'en', fallbackFrom: 'en' } });
  });
  it('medName / medNameField never hide a product for lacking the page language', () => {
    mockLocale = 'ar';
    expect(medName({ id: '2', name_en: 'Only English' })).toBe('Only English');
    expect(medNameField({ id: '2', name_en: 'Only English' }).mark).toMatchObject({ lang: 'en', fallbackFrom: 'en' });
    mockLocale = 'en';
    expect(medNameField({ id: '3', name_ar: 'عربي فقط' }).mark).toMatchObject({ lang: 'ar', fallbackFrom: 'ar' });
    expect(medNameField({ id: '3', name: 'Legacy name' }).text).toBe('Legacy name');
  });
  it('medFieldMark and medListMark read the same rule', () => {
    mockLocale = 'ar';
    expect(medFieldMark(med, 'indications').text).toBe('Pain relief');
    expect(medListMark(med, 'indications').items).toEqual(['Pain relief']);
  });
});

describe('dbLangDir', () => {
  it('Arabic and Urdu are right-to-left', () => {
    expect(['ar', 'ur', 'en', 'hi', 'bn', 'tl'].map((l) => dbLangDir(l as never))).toEqual(['rtl', 'rtl', 'ltr', 'ltr', 'ltr', 'ltr']);
  });
});
