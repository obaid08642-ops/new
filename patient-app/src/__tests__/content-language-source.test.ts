/** Owner rule (2026-10-26): a section is in the app's language, or it says which language it is in. */
let mockLocale = 'ar';
jest.mock('../i18n/LanguageManager', () => ({ LanguageManager: { getInstance: () => ({ i18n: { get locale() { return mockLocale; } } }) } }));

import { dbLangDir, pickDbFieldSource, textLang } from '../utils/localize';
import { medFieldSource } from '../utils/pharmacyCatalog';

const med = {
  indications_ar: '', indications_en: 'Pain relief',
  description_ar: 'وصف عربي', description_en: 'English description',
  warnings_ar: 'تحذير',
  dosage_ar: 'Adults: one tablet every eight hours with water',
  translations: { hi: { description: 'हिंदी विवरण' } },
  strength: '500 مجم',
};

describe('pickDbFieldSource', () => {
  it('Arabic: own text unmarked, English fallback marked', () => {
    mockLocale = 'ar';
    expect(pickDbFieldSource(med, 'description')).toEqual({ value: 'وصف عربي', lang: null });
    expect(pickDbFieldSource(med, 'indications')).toEqual({ value: 'Pain relief', lang: 'en' });
  });
  it('an English text in the Arabic column is marked English', () => {
    mockLocale = 'ar';
    expect(pickDbFieldSource(med, 'dosage')).toEqual({ value: med.dosage_ar, lang: 'en' });
  });
  it('English: falls back to Arabic, marked', () => {
    mockLocale = 'en';
    expect(pickDbFieldSource(med, 'description')).toEqual({ value: 'English description', lang: null });
    expect(pickDbFieldSource(med, 'warnings')).toEqual({ value: 'تحذير', lang: 'ar' });
  });
  it('Hindi: own, then English, then Arabic', () => {
    mockLocale = 'hi';
    expect(pickDbFieldSource(med, 'description')).toEqual({ value: 'हिंदी विवरण', lang: null });
    expect(pickDbFieldSource(med, 'indications')).toEqual({ value: 'Pain relief', lang: 'en' });
    expect(pickDbFieldSource(med, 'warnings')).toEqual({ value: 'تحذير', lang: 'ar' });
  });
  it('nothing stored: no value, no mark', () => {
    mockLocale = 'en';
    expect(pickDbFieldSource(med, 'side_effects')).toEqual({ value: undefined, lang: null });
    expect(pickDbFieldSource(null, 'x')).toEqual({ value: undefined, lang: null });
  });
});

describe('medFieldSource', () => {
  it('a root column counts as Arabic on a page that is not Arabic', () => {
    mockLocale = 'en';
    expect(medFieldSource(med as never, 'strength')).toEqual({ value: '500 مجم', lang: 'ar' });
    mockLocale = 'ar';
    expect(medFieldSource(med as never, 'strength')).toEqual({ value: '500 مجم', lang: null });
  });
});

describe('textLang / dbLangDir', () => {
  it('trusts the slot unless the letters clearly say otherwise', () => {
    expect(textLang('Take one tablet twice daily after food', 'ar')).toBe('en');
    expect(textLang('خذ قرصاً واحداً مرتين يومياً بعد الطعام', 'en')).toBe('ar');
    expect(textLang('Ibuprofen 400', 'ar')).toBe('ar');
    expect(textLang('कुछ', 'hi')).toBe('hi');
  });
  it('Arabic and Urdu are right-to-left', () => {
    expect(['ar', 'ur', 'en', 'hi', 'bn', 'tl'].map((l) => dbLangDir(l as never))).toEqual(['rtl', 'rtl', 'ltr', 'ltr', 'ltr', 'ltr']);
  });
});
