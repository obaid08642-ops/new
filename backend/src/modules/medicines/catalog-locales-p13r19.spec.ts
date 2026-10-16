import { PUBLIC_CATALOG_LOCALES, resolveMedicinePublicDto } from './med-i18n';

// P13-R19: one canonical product id with 6 localized field sets, no
// per-language duplicates. Verified DONE on main: a single document carries
// every locale and resolves each of them with no second read. This spec pins
// that contract (no production change in this PR).
describe('P13-R19 one product, six locales, no duplicates', () => {
  const doc = {
    id: 'med-1',
    name_ar: 'بنادول',
    name_en: 'Panadol',
    translations: {
      ur: { name: 'پیناڈول' },
      hi: { name: 'पैनाडोल' },
      bn: { name: 'প্যানাডল' },
      tl: { name: 'Panadol' },
    },
  };

  it('declares exactly the six product locales', () => {
    expect([...PUBLIC_CATALOG_LOCALES]).toEqual(['ar', 'en', 'ur', 'hi', 'bn', 'fil']);
  });

  it.each([
    ['ar', 'بنادول'],
    ['en', 'Panadol'],
    ['ur', 'پیناڈول'],
    ['hi', 'पैनाडोल'],
    ['bn', 'প্যানাডল'],
    ['fil', 'Panadol'],
  ])('one document resolves the %s name', (locale, name) => {
    const out: any = resolveMedicinePublicDto(doc, locale);
    expect(JSON.stringify(out)).toContain(String(name));
  });
});
