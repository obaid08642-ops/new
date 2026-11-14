import { arabicTokens, duplicateGroups, latinTokens, semanticKeys, weakRadiologyKey } from './catalog-dedupe';

const lab = (id: string, name_ar: string, name_en: string, extra: Record<string, unknown> = {}) => ({ id, name_ar, name_en, ...extra });
const groups = (rows: any[], opts: { byPackage?: boolean } = {}) => duplicateGroups(rows, opts).map((g) => g.map((r) => r.id).sort());

describe('semantic duplicates (owner 2026-10-30)', () => {
  it('the owner\'s example: "سكر تراكمي HbA1c" and "السكر التراكمي HbA1c" are one test', () => {
    expect(groups([lab('a', 'سكر تراكمي HbA1c', 'HbA1c'), lab('b', 'السكر التراكمي HbA1c', 'Glycated Hemoglobin')])).toEqual([['a', 'b']]);
    expect(groups([lab('a', 'سكر تراكمي', 'x'), lab('b', 'السكر التراكمي (HbA1c)', 'y')])).toEqual([['a', 'b']]);   // through the Arabic alias alone
  });

  it('Arabic: the article, taa marbuta / haa, alef forms, ya / alef maqsura, spacing, punctuation and word order do not make a new test', () => {
    expect(groups([lab('a', 'أشعة الصدر', 'p'), lab('b', 'اشعه صدر', 'q')])).toEqual([['a', 'b']]);
    expect(groups([lab('a', 'فحص وظائف الكلى', 'p'), lab('b', 'وظائف  الكلى', 'q')])).toEqual([['a', 'b']]);       // "فحص" is filler
    expect(groups([lab('a', 'مسح الرأس والرقبة', 'p'), lab('b', 'مسح الرقبة والرأس', 'q')])).toEqual([]);          // و-joined words are one token each: not guessed
    expect(arabicTokens('السكر التراكمي')).toEqual(['تراكمي', 'سكر']);
  });

  it('English: case, word order, filler words and known abbreviations', () => {
    const pairs: Array<[string, string]> = [
      ['CBC', 'Complete Blood Count'], ['TSH', 'Thyroid Stimulating Hormone'], ['HbA1c', 'Hemoglobin A1c'], ['Vit D', '25-OH Vitamin D'], ['Vitamin D (25-OH)', '25-Hydroxy Vitamin D'],
      ['ALT', 'SGPT'], ['FBS', 'Fasting Blood Sugar'], ['ESR', 'Erythrocyte Sedimentation Rate'], ['Ferritin Test', 'Serum Ferritin'], ['Thyroid Function Tests', 'TFT'],
    ];
    for (const [x, y] of pairs) expect(groups([lab('a', 'ا', x), lab('b', 'ب', y)])).toEqual([['a', 'b']]);
    expect(groups([lab('a', 'ا', 'Blood Sugar Fasting'), lab('b', 'ب', 'Fasting Blood Sugar')])).toEqual([['a', 'b']]);
  });

  it('same short_code is the same test (case-insensitive)', () => {
    expect(groups([lab('a', 'اول', 'One', { short_code: 'TSH' }), lab('b', 'ثاني', 'Two', { short_code: 'tsh' })])).toEqual([['a', 'b']]);
  });

  it('different tests that look alike stay apart (from the real catalogue)', () => {
    const apart: Array<[any, any]> = [
      [lab('a', 'مستضد البروستاتا (PSA)', 'Prostate Specific Antigen'), lab('b', 'PSA الحر', 'Free PSA')],
      [lab('a', 'وظائف كبد (ALT + AST)', 'Liver Enzymes (ALT + AST)'), lab('b', 'وظائف الكبد', 'Liver Function')],
      [lab('a', 'بروتين سي التفاعلي (CRP)', 'C-Reactive Protein'), lab('b', 'بروتين سي التفاعلي عالي الحساسية (hs-CRP)', 'High-Sensitivity CRP (hs-CRP)')],
      [lab('a', 'هرمون DHEA-S', 'DHEA-S'), lab('b', 'هرمون ACTH', 'ACTH')],
      [lab('a', 'تستوستيرون حر', 'Free Testosterone'), lab('b', 'تستوستيرون كلي', 'Total Testosterone')],
      [lab('a', 'التهاب الكبد ب مستضد سطحي', 'Hepatitis B Surface Antigen'), lab('b', 'التهاب الكبد ب أجسام مضادة', 'Hepatitis B Surface Antibody')],
      [lab('a', 'فيتامين د', 'Vitamin D'), lab('b', 'فيتامين د3', 'Vitamin D3')],
    ];
    for (const [x, y] of apart) expect(groups([x, y])).toEqual([]);
  });

  it('a package is never the single test (labs are grouped by the package flag)', () => {
    expect(groups([lab('a', 'صورة دم', 'CBC', { is_package: false }), lab('b', 'صورة دم', 'CBC', { is_package: true })], { byPackage: true })).toEqual([]);
  });

  it('semanticKeys: empty names make no key; Latin words are kept in the Arabic key', () => {
    expect(semanticKeys({})).toEqual([]);
    expect(semanticKeys(lab('a', 'هرمون DHEA-S', ''))).toContain('ar2:dhea|s|هرمون');
    expect(latinTokens('Vitamin D (25-OH) Test')).toEqual(['25', 'd', 'oh', 'vitamin']);
  });

  it('weakRadiologyKey: modality + body part + contrast, nothing when one is missing', () => {
    expect(weakRadiologyKey({ modality: 'MRI', body_part: 'Knee', contrast_required: true })).toBe('rad:mri|knee|c');
    expect(weakRadiologyKey({ modality: 'mri', body_part: 'knee' })).toBe('rad:mri|knee|n');
    expect(weakRadiologyKey({ modality: 'mri' })).toBeNull();
  });
});
