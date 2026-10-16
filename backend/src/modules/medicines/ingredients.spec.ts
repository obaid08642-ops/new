import { lookupInn, normalizeText } from './inn-normalization';
import { INGREDIENTS_SCOPE_FILTER, inIngredientsScope, ingredientsKey, isLeaflet, parseCatalogueRow, parseNumber, sameIngredientsFilter, splitLeaflet } from './ingredients';

// Every input below is a value found in the production catalogue (public API sample, 2026-10-16; issue 1556).
describe('issue 1556: INN normalization table', () => {
  it.each([
    ['باراسيتامول', 'paracetamol'], ['Paracetamol', 'paracetamol'], ['acetaminophen', 'paracetamol'],
    ['إيبوبروفين', 'ibuprofen'], ['ايبوبروفين', 'ibuprofen'], ['الإيبوبروفين', 'ibuprofen'],
    ['سودوافدرين هيدروكلوريد', 'pseudoephedrine'], ['كلورفينيرامين ماليات', 'chlorphenamine'],
    ['ميتفورمين هيدروكلورايد', 'metformin'], ['الوجليبتين', 'alogliptin'],
    ['ديكلوفيناك الصوديوم', 'diclofenac sodium'], ['ديكلوفيناك صوديوم', 'diclofenac sodium'], ['ديكلوفيناك البوتاسيوم', 'diclofenac potassium'],
    ['فيتامين سي', 'ascorbic acid'], ['فيتامين جـ', 'ascorbic acid'], ['فيتامين د3', 'colecalciferol'], ['كولي كالسيفيرول', 'colecalciferol'],
    ['أوميجا 3', 'omega-3 fatty acids'], ['أوميغا 3', 'omega-3 fatty acids'], ['دى اتش ايه', 'docosahexaenoic acid'],
    ['برو فيتامين ب5', 'panthenol'], ['حمض أسيتيل الساليسيليك', 'acetylsalicylic acid'],
  ])('%s -> %s', (spelling, inn) => expect(lookupInn(spelling)).toBe(inn));

  it('an unknown spelling is not guessed', () => {
    expect(lookupInn('بروفين')).toBeNull(); // a brand, not an INN
    expect(lookupInn('فيتامينات')).toBeNull();
  });

  it('folds Arabic letter variants, diacritics and digits', () => {
    expect(normalizeText('أوميجا ٣')).toBe('اوميجا 3');
    expect(normalizeText('دى')).toBe('دي');
  });
});

describe('issue 1556: numbers', () => {
  it('thousands groups and ambiguity', () => {
    expect(parseNumber('50,000', 'iu')).toBe(50000);
    expect(parseNumber('50.000', 'iu')).toBe(50000);
    expect(parseNumber('1.000', 'mg')).toBeNull();
    expect(parseNumber('12.5', 'mg')).toBe(12.5);
  });
});

describe('issue 1556: parseCatalogueRow', () => {
  const ing = (inn: string, strength_value: number | null = null, strength_unit: string | null = null) => ({ inn, strength_value, strength_unit });

  it('single ingredient takes the strength field; a pack volume is not a strength', () => {
    expect(parseCatalogueRow({ active_ingredient: 'إيبوبروفين', strength: '400 ملجم', form: 'أقراص' }))
      .toMatchObject({ status: 'parsed', ingredients: [ing('ibuprofen', 400, 'mg')], dosage_form: 'tablet', route: 'oral' });
    expect(parseCatalogueRow({ active_ingredient: 'ايبوبروفين /', strength: '150 مل', form: 'شراب' }))
      .toMatchObject({ status: 'parsed', ingredients: [ing('ibuprofen')], dosage_form: 'syrup', route: 'oral' });
    expect(parseCatalogueRow({ active_ingredient: 'باراسيتامول / مل', strength: '15 مل', form: 'نقط' }))
      .toMatchObject({ status: 'parsed', ingredients: [ing('paracetamol')], dosage_form: 'drops', route: null });
  });

  it('combinations: inline strengths per ingredient; the single strength field is not assigned to one part', () => {
    expect(parseCatalogueRow({ active_ingredient: 'باراسيتامول 500 مجم + ديفينهيدرامين 25 مجم.', form: 'أقراص' }).ingredients)
      .toEqual([ing('paracetamol', 500, 'mg'), ing('diphenhydramine', 25, 'mg')]);
    expect(parseCatalogueRow({ active_ingredient: 'سيتاجليبتين / ميتفورمين هيدروكلورايد', strength: '1000 ملجم', form: 'أقراص' }).ingredients)
      .toEqual([ing('sitagliptin'), ing('metformin')]);
    expect(parseCatalogueRow({ active_ingredient: 'فيتامين سي (1000 مجم) وزنك (20 مجم).', form: 'أقراص' }).ingredients)
      .toEqual([ing('ascorbic acid', 1000, 'mg'), ing('zinc', 20, 'mg')]);
    expect(parseCatalogueRow({ active_ingredient: 'ل-كارنتين-فيتامين سي-زنك', strength: '1500 مجم', form: 'أقراص' }).ingredients)
      .toEqual([ing('levocarnitine'), ing('ascorbic acid'), ing('zinc')]);
  });

  it('percent, IU with thousands, mcg/ml, parenthesised refinement', () => {
    expect(parseCatalogueRow({ active_ingredient: 'كيتوبروفين 2.5 % جل', form: 'جل' }))
      .toMatchObject({ ingredients: [ing('ketoprofen', 2.5, '%')], dosage_form: 'gel', route: 'cutaneous' });
    expect(parseCatalogueRow({ active_ingredient: 'فيتامين د 50,000 وحدة دولية كبسول', strength: '50.000 وحدة', form: 'كبسولات' }))
      .toMatchObject({ status: 'parsed', ingredients: [ing('vitamin d', 50000, 'iu')], dosage_form: 'capsule' });
    expect(parseCatalogueRow({ active_ingredient: 'ألفاكالسيدول 2 مكجم/مل', strength: '20 مل', form: 'نقط' }).ingredients)
      .toEqual([ing('alfacalcidol', 2, 'mcg/ml')]);
    expect(parseCatalogueRow({ active_ingredient: 'فيتامين د (كولي كالسيفيرول) 25000 وحدة دولية أمبول عن طريق الفم', strength: '25000 وحدة' }))
      .toMatchObject({ status: 'parsed', ingredients: [ing('colecalciferol', 25000, 'iu')], dosage_form: 'ampoule', route: 'oral' });
  });

  it('form modifiers combine with the form field', () => {
    expect(parseCatalogueRow({ active_ingredient: 'ميتفورمين ممتدة المفعول', strength: '750 مجم', form: 'أقراص' }).dosage_form).toBe('extended_release_tablet');
    expect(parseCatalogueRow({ active_ingredient: 'حمض أسيتيل الساليسيليك + فيتامين سي فوارة', form: 'أقراص' }).dosage_form).toBe('effervescent_tablet');
    expect(parseCatalogueRow({ active_ingredient: 'ديكلوفيناك البوتاسيوم أكياس فوارة', strength: '50 مجم', form: 'أكياس' }).dosage_form).toBe('effervescent_granules');
    expect(parseCatalogueRow({ active_ingredient: 'ديكلوفيناك صوديوم 0.1 % قطرة للعين', strength: '5 مل', form: 'قطرة' }))
      .toMatchObject({ dosage_form: 'eye_drops', route: 'ocular', ingredients: [ing('diclofenac sodium', 0.1, '%')] });
  });

  it('never guesses: unknown words, conflicting strength or form go to review with the reason', () => {
    expect(parseCatalogueRow({ active_ingredient: 'كالسيوم وفيتامينات ومعادن متعددة كبسول', form: 'كبسولات' }))
      .toMatchObject({ status: 'review', reasons: ['unknown_words'], ingredients: [] });
    expect(parseCatalogueRow({ active_ingredient: 'ألفاكالسيدول 0.25 مكجم', strength: '0.25 مجم', form: 'كبسولات' }))
      .toMatchObject({ status: 'review', reasons: ['strength_conflict'] });
    expect(parseCatalogueRow({ active_ingredient: 'ديكلوفيناك لاصقة', form: 'جل' })).toMatchObject({ status: 'review', reasons: ['form_conflict'], dosage_form: null });
    expect(parseCatalogueRow({ active_ingredient: 'ديكلوفيناك الصوديوم سريعة الذوبان', strength: '50 مجم', form: 'أقراص' }).status).toBe('review');
  });

  it('a leaflet in the field is split (storage, warnings, rest), nothing dropped, and sent to review', () => {
    const raw = 'فيتامين د3 (كوليكالسيفيرول) 1000 وحدة دولية، سليلوز، فوسفات ثنائي الكالسيوم، ستيرات المغنيسيوم النباتية.\nالحجم/ المحتوى:\n100 قرص\nيحفظ في درجة حرارة الغرفة';
    expect(isLeaflet(raw)).toBe(true);
    const r = parseCatalogueRow({ active_ingredient: raw });
    expect(r).toMatchObject({ status: 'review', reasons: ['leaflet'], ingredients: [] });
    expect(r.leaflet).toEqual({ lang: 'ar', storage: 'يحفظ في درجة حرارة الغرفة', warnings: [], more_info: raw.split('\n').slice(0, 3).join('\n') });
    expect(splitLeaflet('Nutritional Information\nWarning: keep away from children').lang).toBe('en');
  });

  it('no ingredient text: a name stating "<ingredient> <strength>" alone is used; brands are not', () => {
    expect(parseCatalogueRow({ name_en: 'Jamieson, Vitamin C 1000 Mg - 100 Tablets' })).toMatchObject({ status: 'parsed', source: 'name', ingredients: [ing('ascorbic acid', 1000, 'mg')], dosage_form: 'tablet' });
    expect(parseCatalogueRow({ name_en: 'Panadol Blue Tablets' })).toMatchObject({ status: 'none', ingredients: [], dosage_form: 'tablet' });
  });
});

describe('issue 1547 helper: sameIngredientsFilter', () => {
  const p = { id: 'a', ingredients_status: 'parsed', dosage_form: 'tablet', ingredients: [
    { inn: 'paracetamol', strength_value: 500, strength_unit: 'mg' as const }, { inn: 'caffeine', strength_value: 65, strength_unit: 'mg' as const }] };
  it('matches the INN set + strengths + form, order-independent', () => {
    expect(sameIngredientsFilter(p)).toEqual({ ingredients_key: 'caffeine:65mg+paracetamol:500mg', dosage_form: 'tablet', ingredients_status: { $in: ['parsed', 'reviewed'] }, is_deleted: { $ne: true }, id: { $ne: 'a' } });
    expect(ingredientsKey([...p.ingredients].reverse())).toBe('caffeine:65mg+paracetamol:500mg');
  });
  it('no filter without strengths, form or a confident status', () => {
    expect(sameIngredientsFilter({ ...p, ingredients: [{ inn: 'paracetamol', strength_value: null, strength_unit: null }] })).toBeNull();
    expect(sameIngredientsFilter({ ...p, dosage_form: null })).toBeNull();
    expect(sameIngredientsFilter({ ...p, ingredients_status: 'review' })).toBeNull();
  });
});

describe('issue 1556 H: the ingredient review queue covers the medicine categories only', () => {
  it('keeps medicines, drops cosmetics, care products and devices', () => {
    expect(inIngredientsScope({ category: 'الأدوية والعلاج' })).toBe(true);
    expect(inIngredientsScope({ category: 'أدوية ومكملات غذائية' })).toBe(true);
    for (const c of ['العناية بالبشرة', 'المكياج والإكسسوارات', 'العناية بالشعر', 'العناية الشخصية', 'الرعاية الصحية المنزلية والأجهزة الطبية', 'الأم والطفل', 'الفيتامينات والتغذية الصحية']) {
      expect(inIngredientsScope({ category: c })).toBe(false);
    }
    expect(inIngredientsScope({})).toBe(false);
  });

  it('the database query carries the same scope', () => {
    expect(INGREDIENTS_SCOPE_FILTER).toEqual({ category: { $in: ['الأدوية والعلاج', 'أدوية ومكملات غذائية'] } });
  });
});
