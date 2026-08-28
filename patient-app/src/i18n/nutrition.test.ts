import { nutritionTranslations, nutritionT } from './nutrition';

describe('nutrition translations', () => {
  const baseKeys = Object.keys(nutritionTranslations.ar).sort();

  it('contains every nutrition UI key in all six supported languages', () => {
    Object.entries(nutritionTranslations).forEach(([language, copy]) => {
      expect(Object.keys(copy).sort()).toEqual(baseKeys);
      baseKeys.forEach((key) => expect(copy[key]).toEqual(expect.any(String)));
    });
  });

  it('interpolates values without leaving untranslated placeholders', () => {
    expect(nutritionT('ar', 'mealsLogged', { count: 2 })).toContain('2');
    expect(nutritionT('en', 'waterProgress', { value: 500 })).toContain('500');
  });
});
