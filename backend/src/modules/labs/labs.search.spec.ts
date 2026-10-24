import { labSearchClause } from './labs.service';

// Walkthrough of the website (issue 1550): the lab search found a test only by its Arabic or English name, so a patient reading
// the site in Hindi, Bengali, Urdu or Filipino who typed the name they see found nothing.
describe('labSearchClause', () => {
  it('matches the name in all six languages and the short code', () => {
    const clause = labSearchClause('  cbc ');
    expect(clause.map((c) => Object.keys(c)[0])).toEqual(['name_ar', 'name_en', 'name_ur', 'name_hi', 'name_bn', 'name_tl', 'short_code']);
    const hindi = labSearchClause('रक्त').find((c) => 'name_hi' in c)?.name_hi as RegExp;
    expect(hindi.test('संपूर्ण रक्त गणना (CBC)')).toBe(true);
    const filipino = labSearchClause('pagsukat').find((c) => 'name_tl' in c)?.name_tl as RegExp;
    expect(filipino.test('Pagsukat ng Vital Signs')).toBe(true);
  });

  it('treats the text literally (no regex injection)', () => {
    const re = labSearchClause('a.*b')[0].name_ar;
    expect(re.test('axxb')).toBe(false);
    expect(re.test('a.*b')).toBe(true);
  });
});
