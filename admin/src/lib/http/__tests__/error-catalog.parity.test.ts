/**
 * Drift guard for the admin's copy of the platform error catalogue.
 *
 * `src/lib/http/errors.i18n.json` must stay byte-identical in meaning to
 * `backend/src/common/errors.i18n.json`; the backend owns that file and the
 * admin may not edit it. These tests read the backend file from disk, so an
 * upstream change that is not mirrored here fails the admin suite.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CATALOG_CODES,
  SUPPORTED_LOCALES,
  catalogCodeForStatus,
  catalogCodeFromPayload,
  isCatalogCode,
  lookupCatalogError,
} from '../error-catalog';
import adminCopy from '../errors.i18n.json';

const BACKEND_CATALOGUE = path.resolve(__dirname, '../../../../../backend/src/common/errors.i18n.json');

function backendCatalogue(): Record<string, Record<string, { message: string; nextStep: string }>> {
  return JSON.parse(readFileSync(BACKEND_CATALOGUE, 'utf8'));
}

describe('15.1 — error catalogue parity with the backend', () => {
  it('resolves the backend catalogue inside this repository', () => {
    expect(BACKEND_CATALOGUE.endsWith(path.join('backend', 'src', 'common', 'errors.i18n.json'))).toBe(true);
    expect(existsSync(BACKEND_CATALOGUE)).toBe(true);
    expect(Object.keys(backendCatalogue()).length).toBeGreaterThan(0);
  });

  it('declares the same codes as the backend', () => {
    expect(CATALOG_CODES).toEqual(Object.keys(backendCatalogue()).sort());
  });

  it('has identical messages and next steps for every code and locale', () => {
    const backend = backendCatalogue();
    for (const code of CATALOG_CODES) {
      for (const locale of SUPPORTED_LOCALES) {
        expect(lookupCatalogError(code, locale)).toEqual({
          code,
          message: backend[code][locale].message,
          nextStep: backend[code][locale].nextStep,
        });
      }
    }
  });

  it('supports only the two locales the backend supports', () => {
    expect([...SUPPORTED_LOCALES]).toEqual(['ar', 'en']);
    const backendLocales = new Set(Object.values(backendCatalogue()).flatMap((entry) => Object.keys(entry)));
    expect([...backendLocales].sort()).toEqual([...SUPPORTED_LOCALES]);
  });

  it('falls back to English for an unsupported locale, exactly like the backend', () => {
    expect(lookupCatalogError('AUTHENTICATION_REQUIRED', 'fil')).toEqual(
      lookupCatalogError('AUTHENTICATION_REQUIRED', 'en'),
    );
  });

  it('falls back to UNKNOWN_ERROR for a code the catalogue does not carry', () => {
    const entry = lookupCatalogError('NOT_A_REAL_CODE', 'ar');
    expect(entry.code).toBe('UNKNOWN_ERROR');
    expect(entry.message).toBeTruthy();
    expect(entry.nextStep).toBeTruthy();
  });

  it('never resolves to a blank message or next step for any known code', () => {
    for (const code of CATALOG_CODES) {
      for (const locale of SUPPORTED_LOCALES) {
        const entry = lookupCatalogError(code, locale);
        expect(entry.message.trim().length).toBeGreaterThan(0);
        expect(entry.nextStep.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('matches the backend copy on disk byte for byte', () => {
    const onDisk = readFileSync(path.resolve(__dirname, '../errors.i18n.json'), 'utf8');
    const upstream = readFileSync(BACKEND_CATALOGUE, 'utf8');
    expect(onDisk).toBe(upstream);
  });

  it('recognises every catalogue code and nothing else', () => {
    for (const code of CATALOG_CODES) expect(isCatalogCode(code)).toBe(true);
    for (const code of ['admin_backend_unavailable', 'csrf_validation_failed', '', null, 42]) {
      expect(isCatalogCode(code)).toBe(false);
    }
  });
});

describe('15.1 — HTTP status to catalogue code', () => {
  it('maps every status the catalogue can express', () => {
    expect(catalogCodeForStatus(400)).toBe('INVALID_INPUT');
    expect(catalogCodeForStatus(422)).toBe('INVALID_INPUT');
    expect(catalogCodeForStatus(401)).toBe('AUTHENTICATION_REQUIRED');
    expect(catalogCodeForStatus(403)).toBe('INSUFFICIENT_PERMISSION');
    expect(catalogCodeForStatus(409)).toBe('DUPLICATE_TRANSACTION');
    expect(catalogCodeForStatus(429)).toBe('RATE_LIMITED');
    for (const status of [500, 502, 503, 504]) {
      expect(catalogCodeForStatus(status)).toBe('SERVICE_UNAVAILABLE');
    }
  });

  it('falls through to UNKNOWN_ERROR for anything else rather than inventing a code', () => {
    for (const status of [0, 402, 404, 418, 451]) {
      expect(catalogCodeForStatus(status)).toBe('UNKNOWN_ERROR');
    }
  });

  it('prefers the code the backend already sent in the body', () => {
    expect(catalogCodeFromPayload({ code: 'PRODUCT_OUT_OF_STOCK' }, 500)).toBe('PRODUCT_OUT_OF_STOCK');
    expect(catalogCodeFromPayload({ error_code: 'PAYMENT_REQUIRED' }, 400)).toBe('PAYMENT_REQUIRED');
  });

  it('ignores a body code that is not in the catalogue', () => {
    expect(catalogCodeFromPayload({ code: 'admin_backend_unavailable' }, 502)).toBe('SERVICE_UNAVAILABLE');
    expect(catalogCodeFromPayload(null, 404)).toBe('UNKNOWN_ERROR');
    expect(catalogCodeFromPayload('nonsense', 401)).toBe('AUTHENTICATION_REQUIRED');
  });

  it('resolves every catalogue code to a non-empty localized entry', () => {
    for (const code of CATALOG_CODES) {
      for (const locale of SUPPORTED_LOCALES) {
        const entry = lookupCatalogError(code, locale);
        expect(isCatalogCode(entry.code)).toBe(true);
      }
    }
  });
});

// Guards the import itself: a JSON import that silently became `{}` would make
// every catalogue lookup fall back silently.
describe('15.1 — the copied catalogue is really loaded', () => {
  it('imports the JSON as a populated object', () => {
    expect(Object.keys(adminCopy as object).length).toBeGreaterThan(0);
  });
});