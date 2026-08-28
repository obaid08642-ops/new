import { maternityTranslations, maternityT } from './maternity';

describe('maternity translations', () => {
  const keys = Object.keys(maternityTranslations.ar).sort();
  it('has every maternity UI key in all supported languages', () => {
    Object.values(maternityTranslations).forEach((copy) => {
      expect(Object.keys(copy).sort()).toEqual(keys);
      keys.forEach((key) => expect(copy[key]).toEqual(expect.any(String)));
    });
  });
  it('interpolates dynamic days', () => expect(maternityT('en', 'days', { count: 5 })).toContain('5'));
});
