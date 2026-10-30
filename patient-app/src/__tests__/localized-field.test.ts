/** Ported from patient-web/tests/localized-field.test.tsx: the app helper gives the same results as the web one. */
import { localizedText, markByScript, resolveLocalizedField, resolveLocalizedList } from '../utils/localizedField';

const r = resolveLocalizedField;
describe('resolveLocalizedField', () => {
  it('page language first', () => {
    expect(r({ locale: 'ar', ar: 'باراسيتامول', en: 'Paracetamol' })).toMatchObject({ text: 'باراسيتامول', lang: 'ar', dir: 'rtl', fallback: false, fallbackFrom: null });
    expect(r({ locale: 'en', ar: 'باراسيتامول', en: 'Paracetamol' })).toMatchObject({ text: 'Paracetamol', lang: 'en', dir: 'ltr', fallback: false });
  });
  it('ar falls back to English, en to Arabic, with the note', () => {
    expect(r({ locale: 'ar', en: 'Paracetamol' })).toMatchObject({ text: 'Paracetamol', lang: 'en', dir: 'ltr', fallback: true, fallbackFrom: 'en' });
    expect(r({ locale: 'en', ar: 'باراسيتامول' })).toMatchObject({ text: 'باراسيتامول', lang: 'ar', dir: 'rtl', fallback: true, fallbackFrom: 'ar' });
  });
  it('ur/hi/bn/fil (and the app code tl) prefer English, then Arabic', () => {
    for (const l of ['ur', 'hi', 'bn', 'fil', 'tl']) {
      expect(r({ locale: l, ar: 'باراسيتامول', en: 'Paracetamol' })).toMatchObject({ text: 'Paracetamol', lang: 'en', dir: 'ltr', fallback: false });
      expect(r({ locale: l, ar: 'باراسيتامول' })).toMatchObject({ text: 'باراسيتامول', lang: 'ar', dir: 'rtl', fallback: true, fallbackFrom: 'ar' });
    }
  });
  it('a multilingual field uses its own language, and English is a labelled fallback', () => {
    expect(r({ locale: 'ur', ar: 'ا', en: 'x', perLocale: { ur: 'اردو' } })).toMatchObject({ text: 'اردو', lang: 'ur', dir: 'rtl', fallback: false });
    expect(r({ locale: 'fil', en: 'Hello', perLocale: { tl: 'Kumusta' } })).toMatchObject({ text: 'Kumusta', lang: 'fil', dir: 'ltr' });
    expect(r({ locale: 'tl', en: 'Hello', perLocale: { tl: 'Kumusta' } })).toMatchObject({ text: 'Kumusta', lang: 'fil' });
    expect(r({ locale: 'hi', ar: 'وصف', en: 'Description', perLocale: {} })).toMatchObject({ text: 'Description', lang: 'en', fallback: true, fallbackFrom: 'en' });
  });
  it('detects text in the wrong column', () => {
    expect(r({ locale: 'ar', ar: 'Paracetamol', en: 'باراسيتامول' })).toMatchObject({ text: 'باراسيتامول', lang: 'ar', fallback: false });
    expect(r({ locale: 'en', ar: 'Paracetamol', en: 'باراسيتامول' })).toMatchObject({ text: 'Paracetamol', lang: 'en', fallback: false });
    expect(r({ locale: 'ar', en: 'باراسيتامول' })).toMatchObject({ lang: 'ar', fallback: false });
  });
  it('one value only is shown whatever its column; digits keep their column', () => {
    expect(r({ locale: 'en', ar: '  وصف  ' }).text).toBe('وصف');
    expect(r({ locale: 'ar', ar: null, en: 'Only English' }).text).toBe('Only English');
    expect(r({ locale: 'ar', en: '500' })).toMatchObject({ text: '500', lang: 'en', fallback: true });
  });
  it('empty gives nothing', () => {
    expect(r({ locale: 'ar', ar: '  ', en: '' })).toMatchObject({ text: '', fallback: false });
    expect(localizedText({ locale: 'en' })).toBeUndefined();
  });
});

describe('lists and single strings', () => {
  it('a preparation list is shown whole in one language, English first on ur, the note on a fallback', () => {
    expect(resolveLocalizedList({ locale: 'ur', ar: ['صيام'], en: ['Fast 8 hours', 'Water is fine'] })).toMatchObject({ items: ['Fast 8 hours', 'Water is fine'], lang: 'en', fallback: false });
    expect(resolveLocalizedList({ locale: 'ar', ar: [], en: ['Fast'] })).toMatchObject({ items: ['Fast'], lang: 'en', dir: 'ltr', fallback: true, fallbackFrom: 'en' });
    expect(resolveLocalizedList({ locale: 'en' }).items).toEqual([]);
  });
  it('markByScript tags only a script that is not the page\'s', () => {
    expect(markByScript('ar', 'Panadol')).toEqual({ lang: 'en', dir: 'ltr', fallbackFrom: null });
    expect(markByScript('en', 'بنادول')).toEqual({ lang: 'ar', dir: 'rtl', fallbackFrom: null });
    expect(markByScript('hi', 'بنادول')).toMatchObject({ lang: 'ar' });
    expect(markByScript('ar', 'بنادول')).toBeUndefined();
    expect(markByScript('ar', '500')).toBeUndefined();
  });
});
