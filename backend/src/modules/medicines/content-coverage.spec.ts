import { CONTENT_FIELDS, resolveMedicinePublicDto, storedContentText } from './med-i18n';
import { CONTENT_LOCALES, addProduct, emptyCoverage, slugHealth, slugOf } from './content-coverage';

const p = (extra: Record<string, unknown> = {}) => ({
  id: 'p1', slug: 'drug', name_ar: 'دواء', name_en: 'Drug', form: 'أقراص', category: 'أدوية',
  description_ar: 'وصف', description_en: 'Description', indications_en: 'Pain relief', warnings_ar: 'تحذير',
  translations: { hi: { description: 'विवरण' }, tl: { description: 'Paglalarawan' } }, ...extra,
});

describe('storedContentText', () => {
  it('reads the same slots as the public DTO (columns for ar/en, translations for the rest, `tl` for fil)', () => {
    const raw = p({ usage_instructions_en: 'Take after food', dosage_ar: 'جرعة' });
    expect(storedContentText(raw, 'how_to_use', 'en')).toBe('Take after food');
    expect(storedContentText(raw, 'how_to_use', 'ar')).toBeNull();
    expect(storedContentText(raw, 'dosage_instructions', 'ar')).toBe('جرعة');
    expect(storedContentText(raw, 'description', 'fil')).toBe('Paglalarawan');
    expect(storedContentText(raw, 'form', 'ar')).toBe('أقراص');
    expect(storedContentText(raw, 'form', 'en')).toBeNull();
  });

  it('agrees with the DTO: a field the DTO shows without a mark is stored in the page language, and a marked one is not', () => {
    const raw = p();
    for (const locale of CONTENT_LOCALES) {
      const dto = resolveMedicinePublicDto(raw, locale);
      const shown: Record<string, boolean> = {
        description: !!dto.description, indications: dto.indications.length > 0, warnings: dto.warnings.length > 0,
      };
      for (const f of ['description', 'indications', 'warnings'] as const) {
        if (!shown[f]) continue;
        const own = storedContentText(raw, f, locale) !== null;
        expect(dto.fallback_langs[f] === undefined).toBe(own);
      }
    }
  });
});

describe('addProduct', () => {
  it('counts has / only_other / missing per locale and field', () => {
    const cov = emptyCoverage();
    addProduct(cov, p());
    addProduct(cov, p({ description_ar: '', description_en: '', translations: {} }));
    expect(cov.ar.description).toEqual({ has: 1, only_other: 0, missing: 1 }); // the second product has no description in any language
    expect(cov.hi.description).toEqual({ has: 1, only_other: 0, missing: 1 });
    expect(cov.ur.indications).toEqual({ has: 0, only_other: 2, missing: 0 });
    expect(CONTENT_FIELDS.length).toBeGreaterThan(10);
  });
});

describe('slugs', () => {
  it('a product with a slug of its own, a root slug or only an id resolves; one with nothing at all does not', () => {
    expect(slugOf({ id: 'a', slug: 'root', translations: { ur: { slug: 'اردو-سلاگ' } } }, 'ur')).toEqual({ slug: 'اردو-سلاگ', resolvable: true, own: true, id_only: false });
    expect(slugOf({ id: 'a', slug: 'root' }, 'hi')).toEqual({ slug: 'root', resolvable: true, own: false, id_only: false });
    expect(slugOf({ id: 'a' }, 'en')).toEqual({ slug: 'a', resolvable: true, own: false, id_only: true });
    expect(slugOf({}, 'en')).toEqual({ slug: null, resolvable: false, own: false, id_only: false });
  });
  it('counts duplicates per locale (two products answering the same slug)', () => {
    const rows = [
      { id: '1', slug: 'x', translations: { ur: { slug: 'same' } } },
      { id: '2', slug: 'y', translations: { ur: { slug: 'same' } } },
      { id: '3', slug: 'z' },
      { id: '4' },
      {},
    ];
    expect(slugHealth(rows, 'ur')).toEqual({ products: 5, own_slug: 2, root_slug_only: 1, id_only: 1, unresolvable: 1, duplicates: 2 });
    expect(slugHealth(rows, 'en')).toEqual({ products: 5, own_slug: 0, root_slug_only: 3, id_only: 1, unresolvable: 1, duplicates: 0 });
  });
});
