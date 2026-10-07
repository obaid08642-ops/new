/**
 * P15.1 — the provider-app catalog must stay byte-identical to the backend's
 * `errors.i18n.json`, which is the platform's single source of truth and is owned by
 * the backend agent (this worktree must not edit it).
 *
 * This test is the guard that makes the local copy safe: if the backend adds, removes
 * or rewords a code, provider-app fails here instead of silently drifting.
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  CATALOG,
  DEFAULT_LOCALE,
  FALLBACK_CODE,
  SUPPORTED_LOCALES,
  extractCatalogCode,
  isCatalogCode,
  lookupCatalogError,
  normalizeCatalogCode,
} from '../errorCatalog';

const BACKEND_CATALOG = path.resolve(__dirname, '../../../../backend/src/common/errors.i18n.json');

describe('P15.1 error catalog parity with backend/src/common/errors.i18n.json', () => {
  const backend = JSON.parse(fs.readFileSync(BACKEND_CATALOG, 'utf8'));
  const backendCodes = Object.keys(backend).sort();

  it('the backend catalog file is readable', () => {
    expect(fs.existsSync(BACKEND_CATALOG)).toBe(true);
    expect(backendCodes.length).toBeGreaterThan(0);
  });

  it('covers exactly the same codes — none missing, none invented', () => {
    expect(Object.keys(CATALOG).sort()).toEqual(backendCodes);
  });

  it('reproduces every message and next step verbatim, in both locales', () => {
    for (const code of backendCodes) {
      for (const locale of ['en', 'ar']) {
        expect(CATALOG[code][locale]).toEqual(backend[code][locale]);
      }
    }
  });

  it('declares the same supported locales the backend advertises', () => {
    // `error-catalog.ts` exports SUPPORTED_LOCALES = ['ar', 'en'] even though the
    // product ships ar/en/ur/hi/bn/fil. P15 scope: mirror the backend, not the wish list.
    expect([...SUPPORTED_LOCALES].sort()).toEqual(['ar', 'en']);
    expect(DEFAULT_LOCALE).toBe('en');
    expect(FALLBACK_CODE).toBe('UNKNOWN_ERROR');
  });
});

describe('P15.1 catalog lookup', () => {
  it('isCatalogCode matches the backend rule (known code or the fallback)', () => {
    for (const code of Object.keys(CATALOG)) expect(isCatalogCode(code)).toBe(true);
    expect(isCatalogCode('NOT_A_REAL_CODE')).toBe(false);
    expect(isCatalogCode(undefined)).toBe(false);
  });

  it('normalizes snake_case and lower-case codes the backend emits', () => {
    expect(normalizeCatalogCode('slot_taken')).toBe('SLOT_TAKEN');
    expect(normalizeCatalogCode('  no_availability  ')).toBe('NO_AVAILABILITY');
    expect(normalizeCatalogCode('not a code!')).toBeNull();
    expect(normalizeCatalogCode(42)).toBeNull();
  });

  it('extracts a code from an axios error, a raw payload, and a bare string', () => {
    expect(extractCatalogCode({ code: 'NO_AVAILABILITY' })).toBe('NO_AVAILABILITY');
    expect(extractCatalogCode({ response: { data: { error_code: 'rate_limited' } } })).toBe('RATE_LIMITED');
    expect(extractCatalogCode({ data: { code: 'PAYMENT_REQUIRED' } })).toBe('PAYMENT_REQUIRED');
    expect(extractCatalogCode('INVALID_INPUT')).toBe('INVALID_INPUT');
    expect(extractCatalogCode({ message: 'no code here' })).toBeNull();
  });

  it('always returns a message and a next step, localized', () => {
    const en = lookupCatalogError('NO_AVAILABILITY', 'en');
    const ar = lookupCatalogError('NO_AVAILABILITY', 'ar');
    expect(en.code).toBe('NO_AVAILABILITY');
    expect(en.message).toBe('No availability right now.');
    expect(en.nextStep).toBe('Try another time or date.');
    expect(ar.message).toBe('لا يوجد توفر حالياً.');
    expect(ar.nextStep).toBe('جرّب وقتاً أو تاريخاً آخر.');
    expect(en.fallback).toBe(false);
  });

  it('substitutes the fallback and says so, for unknown codes and locales', () => {
    const unknown = lookupCatalogError('TOTALLY_UNKNOWN', 'en');
    expect(unknown.code).toBe(FALLBACK_CODE);
    expect(unknown.fallback).toBe(true);
    expect(unknown.message).toBe('Something went wrong. Please try again.');

    // Only ar/en are localized; anything else falls back to English, as the backend does.
    const ur = lookupCatalogError('NO_AVAILABILITY', 'ur');
    expect(ur.message).toBe('No availability right now.');

    const freeText = lookupCatalogError('the server exploded', 'en');
    expect(freeText.code).toBe(FALLBACK_CODE);
    expect(freeText.fallback).toBe(false); // never a valid code to begin with
  });
});