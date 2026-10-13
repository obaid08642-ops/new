/**
 * Six-locale parity contract for the patient app.
 *
 * The `ar` and `en` dictionaries are complete, but `ur`, `hi`, `bn` and `fil` each miss
 * keys that Arabic has. Nothing in CI noticed, because the merge in `i18n/index.ts`
 * quietly fills the hole with the Arabic source text — so a Urdu, Hindi, Bengali or
 * Filipino patient is shown 36 Arabic strings inside an otherwise localized screen, and
 * the UI never raises an error.
 *
 * The reviewer's rule of 2026-10-13 is that every user-visible string or notification key
 * ships in all six languages with no fallback. This file is the gate that enforces it.
 *
 * `PENDING_HUMAN_TRANSLATION` below is the honest list of what is not done yet. It is an
 * allowlist, not a licence: a key may only stay on it until a native reviewer supplies the
 * copy. Two tests below make sure the list cannot silently rot — a translated key must
 * come off it, and a brand-new key may never be added to it. Both fail CI, so the debt can
 * only shrink.
 *
 * Machine translation is deliberately not used here. `docs/review/phase-review/P18.md`
 * records that user-facing medical and checkout copy requires a qualified human reviewer;
 * shipping machine output would make the app look localized while a patient cannot
 * actually read what they are agreeing to.
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

/**
 * Keys present in `ar`/`en` but still awaiting a native reviewer in ur/hi/bn/fil.
 * All 36 are checkout, cart and pharmacy copy.
 */
const PENDING_HUMAN_TRANSLATION = [
  'cart.s16', 'cart.s17', 'cart.s18', 'cart.s19', 'cart.s20', 'cart.s21',
  'checkout.s12', 'checkout.s13', 'checkout.s14', 'checkout.s15', 'checkout.s16',
  'checkout.s17', 'checkout.s18', 'checkout.s19', 'checkout.s20', 'checkout.s21',
  'checkout.s22', 'checkout.s23', 'checkout.s24',
  'pharm.s8', 'pharm.s9', 'pharm.s10', 'pharm.s11', 'pharm.s12', 'pharm.s13',
  'pharm.s14', 'pharm.s15', 'pharm.s16', 'pharm.s17', 'pharm.s18', 'pharm.s19',
  'pharm.s20', 'pharm.s21', 'pharm.s22', 'pharm.s23', 'pharm.s24',
] as const;

const PENDING = new Set<string>(PENDING_HUMAN_TRANSLATION);

describe('patient app six-locale parity', () => {
  it('keeps ar and en complete', () => {
    expect(Object.keys(arKeys).sort()).toEqual(Object.keys(enKeys).sort());
  });

  it.each(Object.entries(secondaryKeys))('%s misses nothing outside the pending list', (lang, have) => {
    const missing = Object.keys(arKeys)
      .filter((key) => !(key in have) && !PENDING.has(key))
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

  it('does not let the pending list rot: a translated key must come off it', () => {
    // Guards against the list becoming a permanent excuse. Each time a native reviewer
    // lands a translation this test fails, and the entry is removed.
    const alreadyDone = PENDING_HUMAN_TRANSLATION.filter((key) => {
      const arValue = typeof arKeys[key] === 'string' ? (arKeys[key] as string).trim() : '';
      return Object.values(secondaryKeys).every((have) => {
        const value = have[key];
        // A translated value is present and is not simply the Arabic source repeated.
        return typeof value === 'string' && value.trim() !== '' && value.trim() !== arValue;
      });
    });
    expect(alreadyDone).toEqual([]);
  });

  it('pins the pending list exactly, so new debt cannot be added silently', () => {
    const actuallyMissing = Object.keys(arKeys)
      .filter((key) => Object.values(secondaryKeys).some((have) => !(key in have)))
      .sort();
    expect([...PENDING].sort()).toEqual(actuallyMissing);
  });
});