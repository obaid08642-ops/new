/**
 * Owner rule (2026-10-26): a product section is shown in the page's language; when that language has no text for it, another language is
 * used (Arabic pages: English; English pages: Arabic; ur, hi, bn, fil: English, then Arabic) and the DTO says which one, so the page can
 * mark it. The mixing is never silent.
 */
import { contentDir, contentFallbackOrder, resolveMedicinePublicDto, textLanguage } from './med-i18n';

const base = {
  id: 'p1', slug: 'x', name_ar: 'دواء', name_en: 'Drug', price: 10, form: 'أقراص', category: 'أدوية',
  description_ar: 'وصف عربي كامل للمنتج', description_en: 'English description of the product',
};

describe('contentFallbackOrder / contentDir', () => {
  it('follows the owner rule', () => {
    expect(contentFallbackOrder('ar')).toEqual(['ar', 'en']);
    expect(contentFallbackOrder('en')).toEqual(['en', 'ar']);
    for (const l of ['ur', 'hi', 'bn', 'fil']) expect(contentFallbackOrder(l)).toEqual([l, 'en', 'ar']);
    expect(['ar', 'ur', 'en', 'hi', 'bn', 'fil'].map((l) => contentDir(l as never))).toEqual(['rtl', 'rtl', 'ltr', 'ltr', 'ltr', 'ltr']);
  });
});

describe('textLanguage', () => {
  it('trusts the slot unless the letters clearly say otherwise', () => {
    expect(textLanguage('Take one tablet twice daily after food', 'ar')).toBe('en');
    expect(textLanguage('خذ قرصاً واحداً مرتين يومياً بعد الطعام', 'en')).toBe('ar');
    expect(textLanguage('خذ قرصاً 500 mg', 'ar')).toBe('ar');
    expect(textLanguage('Ibuprofen 400', 'ar')).toBe('ar'); // too short to judge
    expect(textLanguage('کھانے کے بعد ایک گولی', 'ur')).toBe('ur');
  });
});

describe('the Arabic page', () => {
  const raw = { ...base, indications_ar: '', indications_en: 'Pain relief\nFever', usage_instructions_ar: 'يؤخذ بعد الأكل', side_effects_en: 'Nausea', storage_conditions_ar: 'يحفظ في مكان بارد' };
  const dto = resolveMedicinePublicDto(raw, 'ar');
  it('keeps what exists in Arabic unmarked and falls back field by field to English, marked', () => {
    expect(dto.description).toBe('وصف عربي كامل للمنتج');
    expect(dto.how_to_use).toEqual(['يؤخذ بعد الأكل']);
    expect(dto.storage_conditions).toBe('يحفظ في مكان بارد');
    expect(dto.indications).toEqual(['Pain relief', 'Fever']);
    expect(dto.side_effects).toEqual(['Nausea']);
    expect(dto.fallback_langs).toMatchObject({ indications: 'en', side_effects: 'en' });
    expect(Object.keys(dto.fallback_langs).sort()).toEqual(['indications', 'side_effects']);
  });
  it('an English text sitting in the Arabic column is marked English too', () => {
    const d = resolveMedicinePublicDto({ ...base, dosage_ar: 'Adults: one tablet every eight hours with water' }, 'ar');
    expect(d.dosage_instructions).toBe('Adults: one tablet every eight hours with water');
    expect(d.fallback_langs.dosage_instructions).toBe('en');
  });
});

describe('the English page', () => {
  it('falls back to Arabic, marked', () => {
    const d = resolveMedicinePublicDto({ ...base, description_en: '', warnings_ar: 'لا يستعمل مع الكحول' }, 'en');
    expect(d.description).toBe('وصف عربي كامل للمنتج');
    expect(d.warnings).toEqual(['لا يستعمل مع الكحول']);
    expect(d.fallback_langs).toMatchObject({ description: 'ar', warnings: 'ar' });
  });
});

describe('ur, hi, bn and fil pages', () => {
  const raw = {
    ...base,
    indications_en: 'Pain relief', warnings_ar: 'تحذير بالعربية',
    translations: { hi: { name: 'दवा', description: 'हिंदी विवरण', how_to_use: 'भोजन के बाद लें' }, tl: { name: 'Gamot', description: 'Paglalarawan' } },
  };
  it('hi: own text first, then English, then Arabic', () => {
    const d = resolveMedicinePublicDto(raw, 'hi');
    expect(d.description).toBe('हिंदी विवरण');
    expect(d.how_to_use).toEqual(['भोजन के बाद लें']);
    expect(d.indications).toEqual(['Pain relief']);
    expect(d.warnings).toEqual(['تحذير بالعربية']);
    expect(d.fallback_langs).toMatchObject({ indications: 'en', warnings: 'ar' });
    expect(d.fallback_langs.description).toBeUndefined();
    expect(d.fallback_langs.how_to_use).toBeUndefined();
  });
  it('fil is read from the `tl` key of the database', () => {
    const d = resolveMedicinePublicDto(raw, 'fil');
    expect(d.description).toBe('Paglalarawan');
    expect(d.fallback_langs.description).toBeUndefined();
  });
  it('a locale with nothing of its own is entirely marked, never silently mixed', () => {
    const d = resolveMedicinePublicDto(raw, 'bn');
    const shown = { description: d.description, indications: d.indications, warnings: d.warnings };
    expect(shown.description).toBe('English description of the product');
    for (const field of ['description', 'indications', 'warnings']) expect(d.fallback_langs[field]).toBeTruthy();
  });
});

describe('short facts (form, category…)', () => {
  it('a dictionary translation counts as English; an untranslatable Arabic value is marked Arabic', () => {
    const d = resolveMedicinePublicDto({ ...base, form: 'أقراص', category: 'تصنيف غير معروف' }, 'hi');
    expect(d.form).toBe('Tablets');
    expect(d.fallback_langs.form).toBe('en');
    expect(d.category).toBe('تصنيف غير معروف');
    expect(d.fallback_langs.category).toBe('ar');
  });
  it('the page language needs no mark', () => {
    const d = resolveMedicinePublicDto({ ...base, translations: { ur: { dosage_form: 'گولیاں', main_category: 'ادویات' } } }, 'ur');
    expect(d.form).toBe('گولیاں');
    expect(d.fallback_langs.form).toBeUndefined();
    expect(resolveMedicinePublicDto(base, 'ar').fallback_langs).toEqual({});
  });
});
