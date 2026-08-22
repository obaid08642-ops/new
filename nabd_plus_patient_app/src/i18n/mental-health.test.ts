import { mentalHealthT, mentalHealthTranslations } from './mental-health';

describe('mental-health translations', () => {
  it('has every mental-health UI key in all supported languages', () => {
    const keys = Object.keys(mentalHealthTranslations.ar).sort();
    for (const [language, copy] of Object.entries(mentalHealthTranslations)) {
      expect(Object.keys(copy).sort()).toEqual(keys);
      for (const key of keys) expect(copy[key]).toEqual(expect.any(String));
      expect(language).toMatch(/^(ar|en|ur|hi|bn|fil)$/);
    }
  });

  it('interpolates a dynamic entry date', () => {
    expect(mentalHealthT('en', 'recordLabel', { date: '18 Aug' })).toBe('Entry from 18 Aug');
  });
});
