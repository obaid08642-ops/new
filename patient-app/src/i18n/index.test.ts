import { autoTranslate, t, translations } from './index';

describe('shared patient locale contract', () => {
  const languages = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'] as const;
  const baseKeys = Object.keys(translations.ar).sort();

  it('keeps every shared and feature key renderable in all six locales without exposing its technical key', () => {
    for (const language of languages) {
      for (const key of baseKeys) {
        const rendered = t(language, key as keyof typeof translations.ar).trim();
        expect(rendered).not.toBe('');
        expect(rendered).not.toBe(key);
      }
    }
  });

  it('translates known dynamic Arabic copy exactly and does not mutate unknown content', () => {
    expect(autoTranslate('تأكيد الحجز', 'en')).toBe('Confirm Booking');
    expect(autoTranslate('طوارئ', 'ur')).not.toBe('طوارئ');
    expect(autoTranslate('server_owned_unknown_value', 'en')).toBe('server_owned_unknown_value');
  });
});
