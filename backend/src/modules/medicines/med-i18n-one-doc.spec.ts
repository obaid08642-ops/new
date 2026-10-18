import { PUBLIC_CATALOG_LOCALES, resolveMedicinePublicDto } from './med-i18n';

// 13.R19: one product is one document with six localized field sets (`translations.<lang>`), not one document per
// language. Resolving that one document for each of the six public locales gives six views of the same product.
describe('P13-R19 one document, six locales', () => {
  const raw = {
    id: 'med-1',
    name_ar: 'باراسيتامول',
    name_en: 'Paracetamol',
    price: 10,
    translations: {
      ur: { name: 'پیراسیٹامول' },
      hi: { name: 'पैरासिटामोल' },
      bn: { name: 'প্যারাসিটামল' },
      tl: { name: 'Paracetamol 500' },
    },
  };

  it('gives one view per public locale, all for the same product id', () => {
    const views = PUBLIC_CATALOG_LOCALES.map((locale) => resolveMedicinePublicDto(raw, locale));
    expect(views).toHaveLength(6);
    expect(new Set(views.map((v) => v.id))).toEqual(new Set(['med-1']));
  });

  it('gives each locale its own name from the same document', () => {
    const names = Object.fromEntries(PUBLIC_CATALOG_LOCALES.map((locale) => [locale, resolveMedicinePublicDto(raw, locale).name]));
    expect(names).toEqual({
      ar: 'باراسيتامول',
      en: 'Paracetamol',
      ur: 'پیراسیٹامول',
      hi: 'पैरासिटामोल',
      bn: 'প্যারাসিটামল',
      fil: 'Paracetamol 500',
    });
  });
});
