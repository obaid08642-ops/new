import { classifyText, loadInnMap, normalizeKey, parseIngredients, parseStrength, splitComponents } from './ingredient-parse';

/**
 * Issue #1556. The table in these tests is a TEST fixture only (the production table is empty until the owner approves one): it shows that a spelling is mapped
 * only when it is in the approved table and that everything else goes to review.
 */
const TABLE = { paracetamol: 'paracetamol', acetaminophen: 'paracetamol', 'باراسيتامول': 'paracetamol', caffeine: 'caffeine' };

describe('normalizeKey', () => {
  it('lower-cases, drops the strength and the form word, unifies punctuation', () => {
    expect(normalizeKey('Paracetamol 500 mg Tablets')).toBe('paracetamol');
    expect(normalizeKey('  PARACETAMOL (500mg) ')).toBe('paracetamol');
    expect(normalizeKey('Acetaminophen-500 mg')).toBe('acetaminophen');
  });
  it('removes Arabic diacritics and tatweel and unifies alef and ya', () => {
    expect(normalizeKey('بَاراسيتامول 500 مجم أقراص')).toBe('باراسيتامول');
    expect(normalizeKey('إيبوبروفين')).toBe(normalizeKey('ايبوبروفين'));
  });
});

describe('classifyText', () => {
  it('empty, leaflet (long, a link, leaflet wording, a line break) or text', () => {
    expect(classifyText('   ')).toBe('empty');
    expect(classifyText('Paracetamol 500 mg')).toBe('text');
    expect(classifyText('x'.repeat(161))).toBe('leaflet');
    expect(classifyText('See https://example.test/leaflet')).toBe('leaflet');
    expect(classifyText('Paracetamol\nStore at room temperature')).toBe('leaflet');
    expect(classifyText('تحذير: لا تتجاوز الجرعة')).toBe('leaflet');
  });
});

describe('splitComponents and parseStrength', () => {
  it('splits combinations but keeps a ratio whole', () => {
    expect(splitComponents('Paracetamol 500mg + Caffeine 65 mg')).toEqual(['Paracetamol 500mg', 'Caffeine 65 mg']);
    expect(splitComponents('paracetamol and caffeine')).toEqual(['paracetamol', 'caffeine']);
    expect(splitComponents('باراسيتامول و كافيين')).toEqual(['باراسيتامول', 'كافيين']);
    expect(splitComponents('Amoxicillin 250mg/5ml')).toEqual(['Amoxicillin 250mg/5ml']);
  });
  it('reads a strength with its unit, a ratio, a percent and Arabic units; none when none is written', () => {
    expect(parseStrength('500 mg')).toEqual({ value: 500, unit: 'mg' });
    expect(parseStrength('0,5 g')).toEqual({ value: 0.5, unit: 'g' });
    expect(parseStrength('250mg/5ml')).toEqual({ value: 250, unit: 'mg/5ml' });
    expect(parseStrength('1 mg/ml')).toEqual({ value: 1, unit: 'mg/ml' });
    expect(parseStrength('0.025 %')).toEqual({ value: 0.025, unit: '%' });
    expect(parseStrength('500 مجم')).toEqual({ value: 500, unit: 'mg' });
    expect(parseStrength('Paracetamol')).toBeNull();
  });
});

describe('parseIngredients', () => {
  it('empty and leaflet are told apart from ingredient text', () => {
    expect(parseIngredients({ active_ingredient: '' }, TABLE).status).toBe('empty');
    expect(parseIngredients({}, TABLE).status).toBe('empty');
    expect(parseIngredients({ active_ingredient: 'Keep out of reach of children. Store at 25 C.' }, TABLE)).toMatchObject({ status: 'leaflet', reasons: ['leaflet_text'] });
  });

  it('confident only when every component is in the approved table; spelling variants map to one INN', () => {
    const a = parseIngredients({ active_ingredient: 'Paracetamol 500 mg' }, TABLE);
    const b = parseIngredients({ active_ingredient: 'ACETAMINOPHEN' }, TABLE);
    const c = parseIngredients({ active_ingredient: 'باراسيتامول 500 مجم' }, TABLE);
    for (const r of [a, b, c]) expect(r.status).toBe('confident');
    expect([a, b, c].map((r) => r.ingredients[0].inn)).toEqual(['paracetamol', 'paracetamol', 'paracetamol']);
    expect(a.ingredients[0]).toMatchObject({ strength_value: 500, strength_unit: 'mg' });
    expect(c.ingredients[0]).toMatchObject({ strength_value: 500, strength_unit: 'mg' });
  });

  it('a combination keeps one entry per component with its own strength', () => {
    const r = parseIngredients({ active_ingredient: 'Paracetamol 500mg + Caffeine 65 mg' }, TABLE);
    expect(r.status).toBe('confident');
    expect(r.ingredients.map((i) => [i.inn, i.strength_value, i.strength_unit])).toEqual([['paracetamol', 500, 'mg'], ['caffeine', 65, 'mg']]);
  });

  it('one unknown component makes the whole product a review item, nothing is guessed', () => {
    const r = parseIngredients({ active_ingredient: 'Paracetamol + Zzzfoo' }, TABLE);
    expect(r).toMatchObject({ status: 'review', reasons: ['spelling_not_in_approved_table'] });
    expect(r.ingredients.map((i) => i.inn)).toEqual(['paracetamol', null]);
  });

  it('with an empty table (the owner has not approved one) every ingredient text is a review item', () => {
    expect(parseIngredients({ active_ingredient: 'Paracetamol 500 mg' }).status).toBe('review');
  });

  it('a single ingredient may take the product strength field; a combination never does', () => {
    expect(parseIngredients({ active_ingredient: 'Paracetamol', strength: '500mg' }, TABLE).ingredients[0]).toMatchObject({ strength_value: 500, strength_unit: 'mg' });
    const combo = parseIngredients({ active_ingredient: 'Paracetamol + Caffeine', strength: '500mg' }, TABLE);
    expect(combo.ingredients.every((i) => i.strength_value === null)).toBe(true);
  });

  it('uses the generic name only when the active ingredient is empty, and says so', () => {
    expect(parseIngredients({ active_ingredient: '', generic_name: 'Caffeine' }, TABLE)).toMatchObject({ status: 'confident', reasons: ['from_generic_name'] });
    expect(parseIngredients({ active_ingredient: 'Paracetamol', generic_name: 'Caffeine' }, TABLE).ingredients[0].inn).toBe('paracetamol');
  });

  it('a prototype-named spelling is not mapped by accident', () => {
    expect(parseIngredients({ active_ingredient: 'constructor' }, TABLE).status).toBe('review');
  });
});

describe('loadInnMap', () => {
  it('a table nobody approved is ignored whole', () => {
    expect(loadInnMap({ approved_by: null, entries: { paracetamol: 'paracetamol' } })).toEqual({ map: {}, approved: false, entries: 1 });
    expect(loadInnMap({ approved_by: '  ', entries: { paracetamol: 'paracetamol' } }).map).toEqual({});
  });
  it('an approved table keeps only normalized keys with a text INN', () => {
    const r = loadInnMap({ approved_by: 'owner', entries: { paracetamol: 'paracetamol', 'Not Normalized': 'x', caffeine: 7 } });
    expect(r).toEqual({ map: { paracetamol: 'paracetamol' }, approved: true, entries: 1 });
  });
  it('garbage input gives an empty, unapproved table', () => {
    expect(loadInnMap(null)).toEqual({ map: {}, approved: false, entries: 0 });
    expect(loadInnMap('x')).toEqual({ map: {}, approved: false, entries: 0 });
  });
});
