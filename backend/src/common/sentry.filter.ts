import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import { ERROR_CATALOG, type PlatformErrorCode } from './error-catalog';

@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    // P3.2 (F14): translate driver-level errors to client errors so bad
    // ids/shapes return 4xx instead of 500. HttpExceptions pass through.
    const translated = translateMongoError(exception);
    if (translated) {
      exception = translated;
    }

    // Attach active user context to Sentry event if authenticated
    const user = request?.user;
    if (user) {
      Sentry.setUser(sentryUserContext(user));
    }

    // Determine HTTP status code
    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Report only server-side errors (500+) to keep Sentry clean of validation/auth (4xx) noise
    if (status >= 500) {
      Sentry.captureException(exception);
    }

    super.catch(exception, host);
  }
}

/**
 * Phase 13, task 13.R5 (reviewer fix instruction 4): build the Sentry user context from the
 * account id only.
 *
 * Sentry is a third-party processor and this filter runs for *every* authenticated request that
 * throws, including 4xx that are never captured. Sending the patient's e-mail address (and their
 * real name, which the previous `username` field carried) put direct contact data into a system
 * that is neither the PDPL export path nor the PDPL erasure path in `docs/architecture/DATA_MAP.md`
 * §4. Health data is "sensitive" under the Saudi PDPL, so the id is the most we send.
 */
export function sentryUserContext(user: unknown): { id: string } {
  const u = (user ?? {}) as { id?: unknown; account_id?: unknown };
  return { id: String(u.id ?? u.account_id ?? '') };
}

/**
 * Map Mongoose/Mongo driver errors to HTTP semantics:
 * - CastError (bad ObjectId in path/query) → 404 (no such resource)
 * - ValidationError (schema validation on save) → 400
 * - Duplicate key (11000) → 409
 * Returns null when no translation applies.
 */
export function translateMongoError(exception: unknown): HttpException | null {
  if (exception instanceof HttpException) return null;
  const err = exception as { name?: string; code?: number | string };
  if (!err || typeof err !== 'object') return null;
  // Phase 13, task 13.R5: raise catalogued codes rather than raw English status words.
  // The status values are unchanged, so existing callers and specs keep working; only
  // the body gains a stable `code` a client can switch on.
  const codeFor = (name: string): PlatformErrorCode | null => {
    // CastError and a direct `new ObjectId(badInput)` (BSONError) share semantics.
    if (name === 'CastError' || name === 'BSONError') return 'NOT_FOUND';
    if (name === 'ValidationError') return 'BAD_REQUEST';
    return null;
  };
  const byName = err.name ? codeFor(err.name) : null;
  const code = byName ?? (err.name === 'MongoServerError' && err.code === 11000 ? 'CONFLICT' : null);
  if (!code) return null;
  return new HttpException({ statusCode: ERROR_CATALOG[code].status, code, message: code }, ERROR_CATALOG[code].status);
}
