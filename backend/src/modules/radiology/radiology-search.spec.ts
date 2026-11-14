import { radiologySearchClause, RADIOLOGY_NAME_FIELDS } from './radiology.service';

// Issue 1833: the radiology name search matches the Arabic and English name fields (names are ar/en only, owner decision 2026-10-25), escaped, case-insensitive.
describe('issue 1833: radiology name search', () => {
  const matches = (doc: Record<string, string>, search: string) => {
    const { $or } = radiologySearchClause(search);
    return $or.some((cond) => Object.entries(cond).some(([field, re]) => typeof doc[field] === 'string' && re.test(doc[field])));
  };

  it('finds a scan by its Arabic or English name', () => {
    const doc = { name_ar: 'أشعة الصدر', name_en: 'Chest X-Ray' };
    expect(matches(doc, 'chest x-ray')).toBe(true);
    expect(matches(doc, 'أشعة')).toBe(true);
  });

  it('does not match a name in another language by accident', () => {
    expect(matches({ name_en: 'MRI Brain', name_ar: 'رنين الدماغ' }, 'Chest')).toBe(false);
  });

  it('escapes the search text: regex characters are literal', () => {
    expect(matches({ name_en: 'CT (abdomen) .*' }, '(abdomen)')).toBe(true);
    expect(matches({ name_en: 'CT abdomen' }, '.*')).toBe(false);
  });

  it('is case-insensitive and does not use a text index', () => {
    expect(matches({ name_en: 'Chest X-Ray' }, 'CHEST')).toBe(true);
    expect(radiologySearchClause('x')).not.toHaveProperty('$text');
  });

  it('reads exactly the two name fields', () => {
    expect(RADIOLOGY_NAME_FIELDS).toEqual(['name_ar', 'name_en']);
  });
});
