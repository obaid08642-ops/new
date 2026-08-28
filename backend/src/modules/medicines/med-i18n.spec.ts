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
