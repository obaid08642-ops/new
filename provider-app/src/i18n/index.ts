/**
 * Provider app translations: six languages, one JSON file each (src/i18n/locales/{ar,en,ur,hi,bn,tl}.json, flat dotted keys, the same
 * layout as patient-app). Owner rule (2026-10-06): no text is written in a screen; every label, message and accessibility text is a key
 * here and exists in all six languages (tools/design/locale-parity.mjs checks that; tools/design/no-literal-ui-string.mjs ratchets the
 * literals still left in screens). There is no fallback to Arabic or English: a key missing from a language shows the key itself, which
 * the parity check makes impossible to merge.
 */
import ar from './locales/ar.json';
import en from './locales/en.json';
import ur from './locales/ur.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';
import tl from './locales/tl.json';

export const LANGS = ['ar', 'en', 'ur', 'hi', 'bn', 'tl'] as const;
export type Lang = (typeof LANGS)[number];

/** Each language written in its own script (a picker shows these, never a translation of them). */
export const AUTONYMS: Record<Lang, string> = { ar: 'العربية', en: 'English', ur: 'اردو', hi: 'हिन्दी', bn: 'বাংলা', tl: 'Filipino' };

/** Arabic and Urdu are written right to left. */
export const RTL_LANGS: readonly Lang[] = ['ar', 'ur'];
export const isRtlLang = (l: Lang): boolean => RTL_LANGS.includes(l);

const LOCALES: Record<Lang, Record<string, string>> = { ar, en, ur, hi, bn, tl };

/** Every key of the translation files (the English file is the reference). */
export type LocaleKey = keyof typeof en;
/** `t('login')` is shorthand for the common.* keys (the old TR table); any other key is written in full: `t('call.end')`. */
export type CommonShortKey = LocaleKey extends infer K ? (K extends `common.${infer S}` ? S : never) : never;
export type TKey = CommonShortKey | LocaleKey;

export const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LANGS as readonly string[]).includes(v);

/** A device or stored language code ("fil", "fil-PH", "ur-PK", "tl") to one of the six; anything else is null. */
export function langFromCode(code: unknown): Lang | null {
  const c = String(code ?? '').toLowerCase().split(/[-_]/)[0];
  if (c === 'fil') return 'tl';
  return isLang(c) ? c : null;
}

/** The text of a key in a language, with `{name}` placeholders filled from `params`. A missing key answers the key, not another language. */
export function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  const table = LOCALES[lang] ?? LOCALES.en;
  const text = table[key] ?? table[`common.${key}`];
  if (typeof text !== 'string') return key;
  return params ? text.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m)) : text;
}

/** Numbers and dates in the language of the screen (Latin digits stay for Arabic and Urdu, as the rest of the app shows them). */
export function localeTag(lang: Lang): string {
  return { ar: 'ar-SA-u-nu-latn', en: 'en-GB', ur: 'ur-PK-u-nu-latn', hi: 'hi-IN', bn: 'bn-BD-u-nu-latn', tl: 'fil-PH' }[lang];
}
