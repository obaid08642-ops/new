import { medicationT, medicationTranslations } from './medications';

describe('medication translations', () => {
  const languages = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'] as const;

  it('contains every Arabic medication UX key in all six languages', () => {
    const keys = Object.keys(medicationTranslations.ar).sort();
    for (const language of languages) {
      expect(Object.keys(medicationTranslations[language]).sort()).toEqual(keys);
      for (const key of keys) expect(medicationTranslations[language][key].trim()).not.toBe('');
    }
  });

  it('interpolates medication counters without leaving template tokens', () => {
    const result = medicationT('en', 'doseProgress', { taken: 2, scheduled: 3 });
    expect(result).toContain('2');
    expect(result).toContain('3');
    expect(result).not.toContain('{taken}');
    expect(result).not.toContain('{scheduled}');
  });
});
