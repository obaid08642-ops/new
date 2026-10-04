/**
 * 13.R11 — focused spec (mocked in-memory, NO DB): proves parent→child
 * traversal + alias/transliteration resolution over SYNTHETIC fixtures.
 * Real owner-dataset import is out of scope.
 */
import {
  buildR11Index,
  getR11Children,
  getR11Descendants,
  getR11Path,
  resolveR11Alias,
  validateR11Import,
} from './geo-hierarchy-r11';
import { R11_SYNTHETIC_FIXTURES } from './geo-hierarchy-r11.fixtures';

describe('13.R11 geo hierarchy (synthetic fixtures, no DB)', () => {
  const index = buildR11Index(R11_SYNTHETIC_FIXTURES);

  it('indexes exactly 3 regions / 5 cities / 8 districts', () => {
    const all = [...index.byCode.values()];
    expect(all.filter((n) => n.type === 'region')).toHaveLength(3);
    expect(all.filter((n) => n.type === 'city')).toHaveLength(5);
    expect(all.filter((n) => n.type === 'district')).toHaveLength(8);
  });

  it('traverses parent→child: region → cities → districts', () => {
    const cities = getR11Children(index, 'r11-test-region-alpha');
    expect(cities.map((c) => c.code).sort()).toEqual([
      'r11-test-city-one',
      'r11-test-city-two',
    ]);

    const districts = getR11Children(index, 'r11-test-city-one');
    expect(districts.map((d) => d.code).sort()).toEqual([
      'r11-test-district-a1',
      'r11-test-district-a2',
    ]);

    const descendants = getR11Descendants(index, 'r11-test-region-alpha');
    // 2 cities + 3 districts under Alpha (A1, A2, B1).
    expect(descendants).toHaveLength(5);
  });

  it('walks leaf-first path district → city → region', () => {
    const path = getR11Path(index, 'r11-test-district-c1');
    expect(path.map((n) => n.code)).toEqual([
      'r11-test-district-c1',
      'r11-test-city-three',
      'r11-test-region-beta',
    ]);
  });

  it('resolves English alias to the fixture node', () => {
    const hits = resolveR11Alias(index, 'First Test City');
    expect(hits.map((h) => h.code)).toEqual(['r11-test-city-one']);
  });

  it('resolves Arabic name and Latin transliteration alike', () => {
    const byArabic = resolveR11Alias(index, 'حي الاختبار أ1');
    expect(byArabic.map((h) => h.code)).toEqual(['r11-test-district-a1']);

    const byTranslit = resolveR11Alias(index, 'hayy al-ikhtibar a1');
    expect(byTranslit.map((h) => h.code)).toEqual(['r11-test-district-a1']);
  });

  it('validates the synthetic import batch with zero errors', () => {
    const { valid, errors } = validateR11Import(R11_SYNTHETIC_FIXTURES);
    expect(errors).toEqual([]);
    expect(valid).toHaveLength(R11_SYNTHETIC_FIXTURES.length);
  });

  it('rejects rows with missing parents or wrong type ladder', () => {
    const { errors } = validateR11Import([
      ...R11_SYNTHETIC_FIXTURES,
      {
        code: 'r11-test-district-orphan',
        name_ar: 'حي يتيم',
        name_en: 'Orphan Test District',
        type: 'district',
        parent_code: 'r11-test-region-alpha', // region is not a valid district parent
        aliases: [],
        transliterations: [],
        is_active: true,
      },
    ]);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe('r11-test-district-orphan');
  });
});
