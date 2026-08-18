import { guidedCareT, guidedCareTranslations } from './guided-care';

describe('guided-care translations', () => {
  it('has every guided triage and skin self-check key in all supported languages', () => {
    const keys = Object.keys(guidedCareTranslations.ar).sort();
    for (const copy of Object.values(guidedCareTranslations)) {
      expect(Object.keys(copy).sort()).toEqual(keys);
      for (const key of keys) expect(copy[key]).toEqual(expect.any(String));
    }
  });

  it('returns the requested language and falls back safely', () => {
    expect(guidedCareT('en', 'triageTitle')).toBe('Guided symptom triage');
    expect(guidedCareT('unknown', 'skinTitle')).toBe(guidedCareTranslations.ar.skinTitle);
  });
});
