import { t } from '../../i18n';
import { deviceText } from '../../i18n/deviceText';

jest.mock('react-native-localize', () => ({ getLocales: () => [{ languageCode: 'ur' }] }));

const KEYS = ['tour.title', 'tour.fallbackDescription', 'tour.skip', 'tour.next', 'errors.adminRequired', 'map.preview', 'map.marker'] as const;
const LANGS = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'] as const;

describe('the last patient-app literals now come from the locale files in all six languages', () => {
  it.each(KEYS)('%s is a real translation in every language (never the key, never the Arabic source)', (key) => {
    for (const lang of LANGS) {
      const text = t(lang as any, key as any);
      expect(text).toBeTruthy();
      expect(text).not.toBe(key);
      if (lang !== 'ar') expect(text).not.toBe(t('ar' as any, key as any));
    }
    expect(new Set(LANGS.map((l) => t(l as any, key as any))).size).toBe(LANGS.length);
  });

  it("deviceText speaks the device's language (here Urdu)", () => {
    expect(deviceText('tour.skip')).toBe(t('ur' as any, 'tour.skip' as any));
    expect(deviceText('errors.crashTitle')).toBe(t('ur' as any, 'errors.crashTitle' as any));
  });
});
