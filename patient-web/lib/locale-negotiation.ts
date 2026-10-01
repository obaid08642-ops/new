/**
 * Locale negotiation (12.A4).
 *
 * WHY THIS EXISTS AS A PURE FUNCTION
 *
 * `/` redirected to `/ar` for everyone. Saudi-first is a reasonable DEFAULT; it is
 * not a reason to ignore a device that is set to English, Urdu or Hindi — and the
 * user who arrives on the wrong language has no way to tell whether the site
 * guessed wrong or simply does not speak theirs.
 *
 * It is pure and separate so the rules can be tested for all six locales plus the
 * unsupported case without a server, a build or a browser. Locale negotiation is
 * exactly the kind of logic that looks like a one-liner and is wrong in six
 * different ways.
 *
 * THE RULES, IN ORDER
 *
 *  1. A locale already in the URL is NEVER overridden. `preferences.locale` is a
 *     user choice; device detection is a first visit. Letting a device preference
 *     win over an explicit URL would make every bookmark to `/ar` land in English
 *     for some visitors, which is worse than a wrong guess because it is
 *     unpredictable.
 *  2. Exact match on a supported locale wins (`ar`, `en`, `ur`, `hi`, `bn`, `fil`).
 *  3. Then a base-language match: `ar-SA` -> `ar`, `en-GB` -> `en`, `fil-PH` -> `fil`.
 *     Region subtags are dropped because the app has one variant per language; a
 *     device set to `en-US` still wants `en`.
 *  4. Then the first supported language in the user's own priority order, which is
 *     what a list like `fr-FR,ur;q=0.9,en;q=0.8` means: French is unknown, Urdu
 *     is preferred, English is the fallback.
 *  5. Otherwise the default locale. An unknown language is not an error — it is the
 *     overwhelmingly common case, and it must resolve to something renderable
 *     rather than a 404.
 *
 * A malformed header never throws. A language preference is untrusted input from
 * the network and it is always optional.
 */

import { isLocale, locales, type Locale } from './i18n';

/** Saudi-first. The audience, and the language the copy is authored in. */
export const DEFAULT_LOCALE: Locale = 'ar';

/** A preference the user has explicitly chosen outranks anything detected. */
export const LOCALE_PREFERENCE_KEY = 'nabd.locale';

export function isSupportedLocale(value: string): value is Locale {
  return isLocale(value);
}

/**
 * Pick a locale from an `Accept-Language` header.
 *
 * Returns the default for: no header, an empty header, a header with no
 * recognised language, or a header that is not parseable. It never throws and
 * never returns a locale outside the supported set.
 */
export function negotiateLocale(
  acceptLanguage: string | null | undefined,
  supported: readonly Locale[] = locales,
  fallback: Locale = DEFAULT_LOCALE,
): Locale {
  if (!acceptLanguage || typeof acceptLanguage !== 'string') return fallback;

  // "fr;q=0.9, ur;q=0.8" -> [{ lang: 'fr', q: 0.9 }, { lang: 'ur', q: 0.8 }]
  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const lang = (tag || '').trim().toLowerCase();
      const qParam = params.find((p) => p.trim().toLowerCase().startsWith('q='));
      const parsed = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      const q = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 1) : 0;
      return { lang, q };
    })
    // q=0 is an explicit refusal, not a preference.
    .filter((entry) => entry.lang.length > 0 && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  if (!ranked.length) return fallback;

  // 2. exact match
  for (const { lang } of ranked) {
    if ((supported as readonly string[]).includes(lang)) return lang as Locale;
  }

  // 3. base-language match: ar-SA -> ar, en-GB -> en
  for (const { lang } of ranked) {
    const base = lang.split('-')[0];
    if ((supported as readonly string[]).includes(base)) return base as Locale;
  }

  // 4. the user's priority order is already honoured by `ranked`, so having got
  //    here every preference is unsupported.
  return fallback;
}

/**
 * The locale to actually render, given the URL and what the device asked for.
 *
 * The URL wins. This is the whole of rule 1 and it is one line, which is exactly
 * why it needed writing down: the failure it prevents is silent, rare, and only
 * reproducible on a device whose language differs from the URL.
 */
export function resolveLocale(options: {
  /** The locale segment in the URL, if any. */
  urlLocale?: string | null;
  acceptLanguage?: string | null;
  supported?: readonly Locale[];
  fallback?: Locale;
}): Locale {
  const { urlLocale, acceptLanguage, supported = locales, fallback = DEFAULT_LOCALE } = options;
  if (urlLocale && isSupportedLocale(urlLocale)) return urlLocale;
  return negotiateLocale(acceptLanguage, supported, fallback);
}

/** Read the user's explicit choice from storage, if they have made one. */
export function readLocalePreference(storage: { getItem(k: string): string | null } | null): Locale | null {
  if (!storage) return null;
  try {
    const value = storage.getItem(LOCALE_PREFERENCE_KEY);
    return value && isSupportedLocale(value) ? value : null;
  } catch {
    // Private mode throws on localStorage. No preference, not a failure.
    return null;
  }
}

export function writeLocalePreference(
  storage: { setItem(k: string, v: string): void; removeItem(k: string): void } | null,
  locale: Locale | null,
): void {
  if (!storage) return;
  try {
    if (locale) storage.setItem(LOCALE_PREFERENCE_KEY, locale);
    else storage.removeItem(LOCALE_PREFERENCE_KEY);
  } catch {
    /* the choice still applies for this navigation */
  }
}
