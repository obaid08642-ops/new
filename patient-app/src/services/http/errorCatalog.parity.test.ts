/**
 * 15.1 — the client-side error catalogue is a COPY of the backend's
 * `src/common/errors.i18n.json`. This test is what keeps the copy honest: if the
 * backend gains, loses, or rewords a code, this suite goes red instead of the app
 * silently serving a stale message.
 *
 * The backend is read with `node:fs` at test time only. It is never imported at
 * runtime, so nothing in the shipped bundle reaches across the workspace.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  BACKEND_ERROR_CODES,
  ERROR_CATALOG,
  CATALOG_LOCALES,
  isCatalogCode,
  normalizeCatalogCode,
  catalogCodeForStatus,
  lookupCatalogEntry,
  resolveCatalogLocale,
} from './errorCatalog';

const BACKEND_CATALOG_PATH = path.resolve(__dirname, '../../../../backend/src/common/errors.i18n.json');
const LOCAL_CATALOG_PATH = path.resolve(__dirname, './errors.i18n.json');

const backendCatalog = JSON.parse(fs.readFileSync(BACKEND_CATALOG_PATH, 'utf8'));
const localCatalog = JSON.parse(fs.readFileSync(LOCAL_CATALOG_PATH, 'utf8'));

describe('15.1 · error catalogue parity with the backend', () => {
  it('copies every code the backend can emit; ar/en match byte for byte', () => {
    expect(Object.keys(localCatalog).sort()).toEqual(Object.keys(backendCatalog).sort());
    for (const code of Object.keys(backendCatalog)) {
      expect(localCatalog[code].ar).toEqual(backendCatalog[code].ar);
      expect(localCatalog[code].en).toEqual(backendCatalog[code].en);
    }
  });

  it('layers real ur/hi/bn/fil translations (ported from the patient-web slice) on top', () => {
    for (const code of BACKEND_ERROR_CODES) {
      for (const locale of ['ur', 'hi', 'bn', 'fil']) {
        const entry = ERROR_CATALOG[code][locale];
        expect(typeof entry.message).toBe('string');
        expect(entry.message.length).toBeGreaterThan(0);
        expect(typeof entry.nextStep).toBe('string');
        expect(entry.nextStep.length).toBeGreaterThan(0);
        // A real translation, not a copy of the Arabic fallback.
        expect(entry.message).not.toBe(ERROR_CATALOG[code].ar.message);
      }
      // Every ported locale resolves directly — no Arabic fallback.
      for (const locale of ['ur', 'hi', 'bn', 'fil']) {
        expect(resolveCatalogLocale(locale)).toBe(locale);
        expect(lookupCatalogEntry(code, locale).usedFallbackLocale).toBe(false);
        expect(lookupCatalogEntry(code, locale).locale).toBe(locale);
      }
    }
  });

  it('exposes each code for every locale the catalogue carries', () => {
    expect(CATALOG_LOCALES.sort()).toEqual(['ar', 'bn', 'en', 'fil', 'hi', 'ur']);
    for (const code of BACKEND_ERROR_CODES) {
      for (const locale of CATALOG_LOCALES) {
        const entry = ERROR_CATALOG[code][locale];
        expect(typeof entry.message).toBe('string');
        expect(entry.message.length).toBeGreaterThan(0);
        expect(typeof entry.nextStep).toBe('string');
        expect(entry.nextStep.length).toBeGreaterThan(0);
      }
    }
  });

  it('offers one of the three next steps the task names', () => {
    // "retry", "check your connection", "contact support" are expressed as
    // instructions, not as a fixed enum, so assert each theme is reachable.
    const allNextSteps = BACKEND_ERROR_CODES.flatMap((code) => CATALOG_LOCALES.map((l) => ERROR_CATALOG[code][l].nextStep));
    expect(allNextSteps.some((s) => /retry|try again/i.test(s))).toBe(true);
    expect(allNextSteps.some((s) => /sign in|contact support/i.test(s))).toBe(true);
  });

  it('recognises catalogue codes and the legacy aliases, and rejects junk', () => {
    expect(isCatalogCode('RATE_LIMITED')).toBe(true);
    expect(isCatalogCode('rate_limited')).toBe(true); // case-insensitive by design
    expect(isCatalogCode('RATE_LIMITED_V2')).toBe(false);
    expect(normalizeCatalogCode('unauthorized')).toBe('AUTHENTICATION_REQUIRED');
    expect(normalizeCatalogCode('too_many_requests')).toBe('RATE_LIMITED');
    expect(normalizeCatalogCode('slot_taken')).toBe('NO_AVAILABILITY');
    expect(normalizeCatalogCode('something_new_from_the_server')).toBeNull();
    expect(normalizeCatalogCode(42)).toBeNull();
  });

  it('derives a code from every HTTP status a screen can hit', () => {
    expect(catalogCodeForStatus(401)).toBe('AUTHENTICATION_REQUIRED');
    expect(catalogCodeForStatus(403)).toBe('INSUFFICIENT_PERMISSION');
    expect(catalogCodeForStatus(409)).toBe('DUPLICATE_TRANSACTION');
    expect(catalogCodeForStatus(422)).toBe('INVALID_INPUT');
    expect(catalogCodeForStatus(429)).toBe('RATE_LIMITED');
    expect(catalogCodeForStatus(500)).toBe('SERVICE_UNAVAILABLE');
    expect(catalogCodeForStatus(502)).toBe('SERVICE_UNAVAILABLE');
    expect(catalogCodeForStatus(503)).toBe('SERVICE_UNAVAILABLE');
    expect(catalogCodeForStatus(418)).toBe('INVALID_INPUT');
  });

  it('never returns an empty message or next step, in any locale', () => {
    for (const code of BACKEND_ERROR_CODES) {
      for (const locale of ['ar', 'en', 'ur', 'hi', 'bn', 'fil']) {
        const entry = lookupCatalogEntry(code, locale);
        expect(entry.message.length).toBeGreaterThan(0);
        expect(entry.nextStep.length).toBeGreaterThan(0);
        expect(entry.locale).toBe(resolveCatalogLocale(locale));
      }
    }
  });
});
