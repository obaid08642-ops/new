/**
 * Owner rule (2026-10-27, replacing the marked fallback of 2026-10-26): a leaflet section is shown in the page's language or not at all. A
 * section whose own language has no text, or whose text is really in another language (an Arabic leaflet in the English column), is absent
 * from the DTO, so the page hides it until it is translated. Names and short facts (a brand, a form, a category) still fall back and say so.
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
  it('keeps what exists in Arabic and HIDES a section that has only an English text (owner 2026-10-27: a translated field over a mixed language)', () => {
    expect(dto.description).toBe('وصف عربي كامل للمنتج');
    expect(dto.how_to_use).toEqual(['يؤخذ بعد الأكل']);
    expect(dto.storage_conditions).toBe('يحفظ في مكان بارد');
    expect(dto.indications).toEqual([]);
    expect(dto.side_effects).toEqual([]);
    expect(dto.fallback_langs).toEqual({});
  });
  it('an English text sitting in the Arabic column is not an Arabic text: the section is hidden until it is moved and translated', () => {
    const d = resolveMedicinePublicDto({ ...base, dosage_ar: 'Adults: one tablet every eight hours with water' }, 'ar');
    expect(d.dosage_instructions).toBeNull();
    expect(d.fallback_langs.dosage_instructions).toBeUndefined();
  });
});

describe('the English page', () => {
  it('hides a section that has only an Arabic text', () => {
    const d = resolveMedicinePublicDto({ ...base, description_en: '', warnings_ar: 'لا يستعمل مع الكحول' }, 'en');
    expect(d.description).toBeNull();
    expect(d.warnings).toEqual([]);
    expect(d.fallback_langs).toEqual({});
  });
  it('an Arabic text sitting in the English column is hidden too', () => {
    const d = resolveMedicinePublicDto({ ...base, description_en: 'وصف عربي طويل موضوع في عمود اللغة الإنجليزية بالخطأ' }, 'en');
    expect(d.description).toBeNull();
  });
  it('its own English text is shown', () => {
    expect(resolveMedicinePublicDto(base, 'en').description).toBe('English description of the product');
  });
});

describe('ur, hi, bn and fil pages', () => {
  const raw = {
    ...base,
    indications_en: 'Pain relief', warnings_ar: 'تحذير بالعربية',
    translations: { hi: { name: 'दवा', description: 'हिंदी विवरण', how_to_use: 'भोजन के बाद लें' }, tl: { name: 'Gamot', description: 'Paglalarawan' } },
  };
  it('hi: its own text only; the sections it lacks are absent (no English, no Arabic)', () => {
    const d = resolveMedicinePublicDto(raw, 'hi');
    expect(d.description).toBe('हिंदी विवरण');
    expect(d.how_to_use).toEqual(['भोजन के बाद लें']);
    expect(d.indications).toEqual([]);
    expect(d.warnings).toEqual([]);
    for (const field of ['description', 'indications', 'warnings', 'how_to_use']) expect(d.fallback_langs[field]).toBeUndefined();   // only short facts (form, category) may still say they fell back
  });
  it('fil is read from the `tl` key of the database', () => {
    const d = resolveMedicinePublicDto(raw, 'fil');
    expect(d.description).toBe('Paglalarawan');
    expect(d.fallback_langs.description).toBeUndefined();
  });
  it('a locale with nothing of its own has no leaflet sections at all, but still a name', () => {
    const d = resolveMedicinePublicDto(raw, 'bn');
    expect(d.description).toBeNull();
    expect(d.indications).toEqual([]);
    expect(d.warnings).toEqual([]);
    expect(d.name).toBeTruthy();
    expect(d.fallback_langs.description).toBeUndefined();
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
