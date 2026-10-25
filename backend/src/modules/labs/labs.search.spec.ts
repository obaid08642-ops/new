import { labSearchClause } from './labs.service';

// The names of tests are Arabic and English only (owner decision 2026-10-25), so the search reads those two and the short code.
describe('labSearchClause', () => {
  it('matches the Arabic and English name and the short code', () => {
    const clause = labSearchClause('  cbc ');
    expect(clause.map((c) => Object.keys(c)[0])).toEqual(['name_ar', 'name_en', 'short_code']);
    const english = clause.find((c) => 'name_en' in c)?.name_en as RegExp;
    expect(english.test('Complete Blood Count (CBC)')).toBe(true);
  });

  it('treats the text literally (no regex injection)', () => {
    const re = labSearchClause('a.*b')[0].name_ar;
    expect(re.test('axxb')).toBe(false);
    expect(re.test('a.*b')).toBe(true);
  });
});
