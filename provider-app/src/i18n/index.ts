/**
 * Provider app translations: Arabic and English (owner decision 2026-10-31: the provider app stays in two languages), one JSON file each
 * (src/i18n/locales/{ar,en}.json, flat dotted keys, the same layout as patient-app). Owner rule (2026-10-06): no text is written in a screen; every label, message and accessibility text is a key
 * here and exists in both languages (tools/design/locale-parity.mjs checks that; tools/design/no-literal-ui-string.mjs ratchets the
 * literals still left in screens). There is no fallback to Arabic or English: a key missing from a language shows the key itself, which
 * the parity check makes impossible to merge.
 */
import ar from './locales/ar.json';
import en from './locales/en.json';

export const LANGS = ['ar', 'en'] as const;
export type Lang = (typeof LANGS)[number];

/** Each language written in its own script (a picker shows these, never a translation of them). */
export const AUTONYMS: Record<Lang, string> = { ar: 'العربية', en: 'English' };

/** Arabic is written right to left. */
export const RTL_LANGS: readonly Lang[] = ['ar'];
export const isRtlLang = (l: Lang): boolean => RTL_LANGS.includes(l);

const LOCALES: Record<Lang, Record<string, string>> = { ar, en };

/** Every key of the translation files (the English file is the reference). */
export type LocaleKey = keyof typeof en;
/** `t('login')` is shorthand for the common.* keys (the old TR table); any other key is written in full: `t('call.end')`. */
export type CommonShortKey = LocaleKey extends infer K ? (K extends `common.${infer S}` ? S : never) : never;
export type TKey = CommonShortKey | LocaleKey;

export const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LANGS as readonly string[]).includes(v);

/** A device or stored language code ("ar-SA", "en_GB") to ar or en; anything else is null (the caller picks English). */
export function langFromCode(code: unknown): Lang | null {
  const c = String(code ?? '').toLowerCase().split(/[-_]/)[0];
  return isLang(c) ? c : null;
}

/** The text of a key in a language, with `{name}` placeholders filled from `params`. A missing key answers the key, not another language. */
export function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  const table = LOCALES[lang] ?? LOCALES.en;
  const text = table[key] ?? table[`common.${key}`];
  if (typeof text !== 'string') return key;
  return params ? text.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m)) : text;
}

/** Numbers and dates in the language of the screen (Latin digits stay for Arabic, as the rest of the app shows them). */
export function localeTag(lang: Lang): string {
  return lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB';
}
