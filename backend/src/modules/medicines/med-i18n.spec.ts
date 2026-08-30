import { missingPublicMedicineTranslations, PUBLIC_CATALOG_LOCALES } from './med-i18n';

const complete = {
  name_ar: 'دواء تجريبي',
  name_en: 'Sample medicine',
  category: 'medications',
  active_ingredient: 'sample ingredient',
  form: 'tablet',
  strength: '500mg',
  translations: {
    ur: { name: 'نمونہ دوا', main_category: 'ادویات', active_ingredient: 'نمونہ جزو', dosage_form: 'گولی', strength: '500mg' },
    hi: { name: 'नमूना दवा', main_category: 'दवाएं', active_ingredient: 'नमूना घटक', dosage_form: 'गोली', strength: '500mg' },
    bn: { name: 'নমুনা ওষুধ', main_category: 'ওষুধ', active_ingredient: 'নমুনা উপাদান', dosage_form: 'ট্যাবলেট', strength: '500mg' },
    tl: { name: 'Halimbawang gamot', main_category: 'Mga gamot', active_ingredient: 'Halimbawang sangkap', dosage_form: 'Tableta', strength: '500mg' },
  },
};

describe('public medicine translation completeness', () => {
  it('confirms the product contract is exactly six locales', () => {
    expect(PUBLIC_CATALOG_LOCALES).toEqual(['ar', 'en', 'ur', 'hi', 'bn', 'fil']);
  });

  it('accepts all display-critical Arabic, English, Urdu, Hindi, Bengali and Filipino translations', () => {
    expect(missingPublicMedicineTranslations(complete)).toEqual([]);
  });

  it('reports a Filipino gap using the product locale while reading the internal tl map', () => {
    const incomplete = structuredClone(complete);
    delete (incomplete.translations.tl as any).name;
    delete (incomplete.translations.hi as any).dosage_form;

    expect(missingPublicMedicineTranslations(incomplete)).toEqual(expect.arrayContaining(['fil.name', 'hi.dosage_form']));
  });
});

import { resolveMedicinePublicDto, productLocaleToDb } from './med-i18n';

const v14 = {
  id: 'med_v14_100002', sku: 697836, slug: 'abilify-aripiprazole-15-mg-28-tablets',
  name_ar: 'أبليفاي، أريبيبرازول 15 مجم - 28 قرص', name_en: 'Abilify, Aripiprazole 15 Mg - 28 Tablets',
  category: 'الأدوية والعلاج', sub_category: 'أدوية بوصفة طبية',
  form: 'أقراص', strength: '15 مجم', package_size: '28 قرص', active_ingredient: 'أريبيبرازول',
  price: 419.6, old_price: 500, requires_prescription: true, availability_status: 'none',
  description_ar: 'وصف عربي', description_en: 'English description',
  indications_ar: ['يستخدم لعلاج الفصام'], indications_en: ['Used to treat schizophrenia'],
  translations: {
    ar: { name: 'أبليفاي، أريبيبرازول 15 مجم - 28 قرص', slug: 'أبليفاي-أريبيبرازول-15-مجم-28-قرص', main_category: 'الأدوية والعلاج' },
    en: { name: 'Abilify, Aripiprazole 15 Mg - 28 Tablets', slug: 'abilify-aripiprazole-15-mg-28-tablets', main_category: 'Medicine & Treatment' },
    ur: { name: 'ایبلیفائی', slug: 'ایبلیفائی-15', main_category: 'ادویات اور علاج', description: 'اردو تفصیل', indications_uses: ['اردو استعمال'] },
    hi: { name: 'एबिलिफाई', slug: 'एबलफई-15' },
    bn: { name: 'অ্যাবিলিফাই', slug: 'অযবলফই-15' },
    tl: { name: 'Abilify', slug: 'abilify-aripiprazole-15-mg-28-tablets' },
  },
};

describe('strict per-locale public DTO', () => {
  it('maps Filipino product locale to the internal tl key', () => {
    expect(productLocaleToDb('fil')).toBe('tl');
    expect(productLocaleToDb('ar')).toBe('ar');
    expect(productLocaleToDb('en')).toBe('en');
  });

  it('resolves Arabic without any foreign-language leakage', () => {
    const dto = resolveMedicinePublicDto(v14, 'ar');
    expect(dto.name).toBe('أبليفاي، أريبيبرازول 15 مجم - 28 قرص');
    expect(dto.description).toBe('وصف عربي');
    expect(dto.indications).toEqual(['يستخدم لعلاج الفصام']);
    expect(dto.category).toBe('الأدوية والعلاج');
    expect(dto.form).toBe('أقراص');
    expect(dto.slug).toBe('أبليفاي-أريبيبرازول-15-مجم-28-قرص');
  });

  it('resolves Urdu fully from the Urdu translation map, never Arabic', () => {
    const dto = resolveMedicinePublicDto(v14, 'ur');
    expect(dto.name).toBe('ایبلیفائی');
    expect(dto.description).toBe('اردو تفصیل');
    expect(dto.indications).toEqual(['اردو استعمال']);
    expect(dto.category).toBe('ادویات اور علاج');
    expect(dto.slug).toBe('ایبلیفائی-15');
  });

  it('falls back to English per-field when a locale gap exists (never mixing with Arabic first)', () => {
    const dto = resolveMedicinePublicDto(v14, 'hi');
    expect(dto.name).toBe('एबिलिफाई');
    expect(dto.description).toBe('English description');
    expect(dto.indications).toEqual(['Used to treat schizophrenia']);
    expect(dto.category).toBe('Medicine & Treatment');
  });

  it('localizes Arabic-only fact fields via dictionaries for non-Arabic locales', () => {
    const dto = resolveMedicinePublicDto(v14, 'en');
    expect(dto.form).toBe('Tablets');
    expect(dto.strength).toBe('15 mg');
    expect(dto.package_size).toBe('28 Tabs');
  });

  it('exposes per-locale slugs for true hreflang URLs', () => {
    const dto = resolveMedicinePublicDto(v14, 'en');
    expect(dto.slugs.ar).toBe('أبليفاي-أريبيبرازول-15-مجم-28-قرص');
    expect(dto.slugs.ur).toBe('ایبلیفائی-15');
    expect(dto.slugs.fil).toBe('abilify-aripiprazole-15-mg-28-tablets');
  });

  it('computes discount from old_price and keeps governance facts', () => {
    const dto = resolveMedicinePublicDto(v14, 'en');
    expect(dto.price).toBe(419.6);
    expect(dto.old_price).toBe(500);
    expect(dto.discount_percent).toBe(16);
    expect(dto.has_discount).toBe(true);
    expect(dto.is_rx).toBe(true);
    expect(dto.currency).toBe('SAR');
  });
});
