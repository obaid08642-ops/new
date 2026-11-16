import ar from '../i18n/locales/ar.json';
import en from '../i18n/locales/en.json';

/** The `t` of the language context in tests: the real locale text for a key (the key itself when the file has none), so a test reads what the provider reads. */
export const tFor = (lang: 'ar' | 'en') => (key: string): string => ((lang === 'ar' ? ar : en) as Record<string, string>)[key] ?? key;

/** For tests that assert on hand-written keys (they keep seeing the key) while the strings moved out of the screens (keys like `wizard.1a2b3c4d`) read as the English they were. */
export const tGeneratedOnly = (lang: 'ar' | 'en') => (key: string): string => (/^[a-z]+\.[0-9a-f]{8}$/.test(key) ? tFor(lang)(key) : key);
