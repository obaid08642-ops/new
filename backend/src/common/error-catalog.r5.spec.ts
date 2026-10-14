/**
 * Phase 13, task 13.R5 — user-safe error catalog.
 *
 * The defect these tests pin down: `translateMongoError` used to raise raw English
 * words (`'Not Found'`, `'Bad Request'`, `'Conflict'`). A client in Urdu had no way to
 * tell what went wrong, and the string was not a stable identifier either. Per
 * §2 rule 5 of docs/review/OPENCODE_PLAN_2026-10-09.md a client-facing failure must
 * carry a **code**, and per the reviewer instruction of 2026-10-13 the backend copy
 * for those codes lives in `i18n.service.ts` (ar/en/ur).
 */
import { HttpException, HttpStatus } from '@nestjs/common';
import { DICTIONARY } from '../modules/i18n/i18n.service';
import { translateMongoError } from './sentry.filter';
import {
  ERROR_CATALOG,
  errorCodeForStatus,
  isPlatformErrorCode,
  platformErrorBody,
} from './error-catalog';

/** Every backend language the catalog promises. Mirrors the reviewer's ar/en/ur rule. */
const BACKEND_LANGS = ['ar', 'en', 'ur'] as const;

describe('13.R5 error catalog', () => {
  describe('translateMongoError emits codes, not English words', () => {
    it('maps a CastError to 404 with the not_found code', () => {
      const ex = translateMongoError({ name: 'CastError' })!;
      expect(ex.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(ex.getResponse()).toMatchObject({ code: 'not_found' });
    });

    it('maps a BSONError (direct new ObjectId(bad)) to the same 404 code', () => {
      const ex = translateMongoError({ name: 'BSONError' })!;
      expect(ex.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(ex.getResponse()).toMatchObject({ code: 'not_found' });
    });

    it('maps a mongoose ValidationError to 400 with the bad_request code', () => {
      const ex = translateMongoError({ name: 'ValidationError' })!;
      expect(ex.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(ex.getResponse()).toMatchObject({ code: 'bad_request' });
    });

    it('maps a duplicate-key error to 409 with the conflict code', () => {
      const ex = translateMongoError({ name: 'MongoServerError', code: 11000 })!;
      expect(ex.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(ex.getResponse()).toMatchObject({ code: 'conflict' });
    });

    it('never leaks a raw English status word into the response body', () => {
      const cases = [
        { name: 'CastError' },
        { name: 'BSONError' },
        { name: 'ValidationError' },
        { name: 'MongoServerError', code: 11000 },
      ];
      for (const input of cases) {
        const body = JSON.stringify(translateMongoError(input)!.getResponse());
        for (const word of ['Not Found', 'Bad Request', 'Conflict', 'Unauthorized', 'Forbidden']) {
          expect(body).not.toContain(word);
        }
      }
    });

    it('still returns null for anything it does not own, and never double-translates', () => {
      expect(translateMongoError({ name: 'WeirdError' })).toBeNull();
      expect(translateMongoError(new HttpException('x', 400))).toBeNull();
      expect(translateMongoError(new Error('boom'))).toBeNull();
      expect(translateMongoError(undefined)).toBeNull();
    });
  });

  describe('platformErrorBody', () => {
    it('returns the status, the code, and the localized message', () => {
      const ar = platformErrorBody('not_found', 'ar');
      expect(ar).toMatchObject({ statusCode: HttpStatus.NOT_FOUND, code: 'not_found' });
      expect(ar.message.length).toBeGreaterThan(0);
    });

    it('honours every backend language with a genuinely different string', () => {
      const seen = new Set<string>();
      for (const lang of BACKEND_LANGS) {
        const body = platformErrorBody('conflict', lang);
        expect(body.message).toBeTruthy();
        seen.add(body.message);
      }
      expect(seen.size).toBe(BACKEND_LANGS.length);
    });

    it('falls back to English for an unsupported language instead of dropping the key', () => {
      const body = platformErrorBody('conflict', 'tl' as any);
      expect(body.message).toBe(platformErrorBody('conflict', 'en').message);
      expect(body.message).toBeTruthy();
    });

    it('keeps the code authoritative even when a message is missing', () => {
      const body = platformErrorBody('not_found', 'ar', { forceMissing: true });
      expect(body.code).toBe('not_found');
      expect(body.message).toBeTruthy();
    });
  });

  describe('catalog integrity', () => {
    it('has a dictionary entry in ar, en and ur for every catalogued code', () => {
      for (const [code, entry] of Object.entries(ERROR_CATALOG)) {
        const dict = DICTIONARY[entry.i18nKey];
        expect(`${code} -> ${entry.i18nKey}` && dict).toBeDefined();
        for (const lang of BACKEND_LANGS) {
          expect(`${code}.${lang} = ${String(dict?.[lang as any])}`.length).toBeGreaterThan(
            `${code}.${lang} = `.length,
          );
        }
      }
    });

    it('agrees with HTTP status on every entry', () => {
      for (const [code, entry] of Object.entries(ERROR_CATALOG)) {
        expect(errorCodeForStatus(entry.status)).toBe(code);
      }
    });

    it('recognises its own codes and rejects unknown ones', () => {
      expect(isPlatformErrorCode('conflict')).toBe(true);
      expect(isPlatformErrorCode('DUPLICATE_TRANSACTION')).toBe(false);
    });

    it('maps an unmapped 4xx/5xx to internal_error rather than leaking the status', () => {
      expect(errorCodeForStatus(418)).toBe('internal_error');
      expect(errorCodeForStatus(500)).toBe('internal_error');
    });
  });
});