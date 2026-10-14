/**
 * Six-locale parity contract for the patient app.
 *
 * `i18n/index.ts` quietly fills a missing key with the Arabic source text, so a gap never
 * raises an error: an Urdu, Hindi, Bengali or Filipino patient just sees Arabic inside a
 * localized screen. The owner's rule (AGENTS.md, translation rule) is every key in all six
 * languages with no fallback; this file is the gate that enforces it.
 */
import { describe, expect, it } from '@jest/globals';

import ar from './locales/ar.json';
import bn from './locales/bn.json';
import en from './locales/en.json';
import hi from './locales/hi.json';
import tl from './locales/tl.json';
import ur from './locales/ur.json';

type Dictionary = Record<string, unknown>;

/**
 * `tl.json` is the filename on disk; `fil` is the contract language code. `index.ts`
 * binds `fil: tlLocale` at load time, so the file name is a packaging detail only.
 */
const SECONDARY = { ur, hi, bn, fil: tl } as const;

function flatten(value: unknown, prefix = ''): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return { [prefix]: value };
  return Object.entries(value as Dictionary).flatMap(([key, child]) =>
    Object.entries(flatten(child, prefix ? `${prefix}.${key}` : key)),
  ).reduce<Record<string, unknown>>((acc, [k, v]) => ((acc[k] = v), acc), {});
}

const arKeys = flatten(ar);
const enKeys = flatten(en);
/** Flattened once per language. Re-flattening inside a 3k-key loop was ~5 minutes. */
const secondaryKeys = Object.fromEntries(
  Object.entries(SECONDARY).map(([lang, dict]) => [lang, flatten(dict)]),
);

/** Scripts that must not carry Arabic letters: a hit means the Arabic source was copied in. */
const ARABIC_LETTERS = /[\u0600-\u06FF]/;
const NON_ARABIC_SCRIPT = { en, hi, bn, fil: tl } as const;

describe('patient app six-locale parity', () => {
  it('keeps ar and en complete', () => {
    expect(Object.keys(arKeys).sort()).toEqual(Object.keys(enKeys).sort());
  });

  it.each(Object.entries(secondaryKeys))('%s misses no key Arabic has', (lang, have) => {
    const missing = Object.keys(arKeys)
      .filter((key) => !(key in have))
      .sort();
    expect(missing).toEqual([]);
  });

  it.each(Object.entries(secondaryKeys))('%s carries no key Arabic does not have', (lang, have) => {
    expect(Object.keys(have).filter((k) => !(k in arKeys)).sort()).toEqual([]);
  });

  it.each(Object.entries(secondaryKeys))('%s has real copy, never an empty string', (lang, have) => {
    const blank = Object.entries(have)
      .filter(([, v]) => typeof v === 'string' && v.trim() === '')
      .map(([k]) => k)
      .sort();
    expect(blank).toEqual([]);
  });

  it.each(Object.entries(NON_ARABIC_SCRIPT).map(([lang, dict]) => [lang, flatten(dict)] as const))(
    '%s carries no Arabic source text',
    (lang, have) => {
      const arabic = Object.entries(have)
        .filter(([, v]) => typeof v === 'string' && ARABIC_LETTERS.test(v))
        .map(([k]) => k)
        .sort();
      expect(arabic).toEqual([]);
    },
  );
});
