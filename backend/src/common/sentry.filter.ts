import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import { ERROR_CODES, isErrorCode } from './errors';
import { buildPlatformError, isCatalogCode } from './error-catalog';

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

    // 13.R5: normalize every HttpException body to the platform {code,message}
    // envelope so clients never see raw {status,error} shapes or bare strings.
    // Throw sites are untouched — normalization happens here, once.
    if (exception instanceof HttpException) {
      const raw = exception.getResponse();
      const normalized = normalizeHttpExceptionBody(exception.getStatus(), raw) ?? (raw as Record<string, unknown>);
      exception = new HttpException(withCatalogNextStep(normalized, requestLocale(request)), exception.getStatus());
    }

    // Attach active user context to Sentry event if authenticated
    const user = request?.user;
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email || '',
        username: user.name || user.id,
      });
    }

    // Determine HTTP status code
    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Report only server-side errors (500+) to keep Sentry clean of validation/auth (4xx) noise
    if (status >= 500) {
      Sentry.captureException(exception);
    }

    // 5d1528c: an error is never cacheable, including guard 401/403 and
    // unmatched-route 404s that never reach the route-cache interceptor.
    const response = ctx.getResponse();
    if (response && typeof response.setHeader === 'function' && !response.headersSent) {
      response.setHeader('Cache-Control', 'private, no-store');
      response.setHeader('X-Cache-Hint', 'private');
    }

    super.catch(exception, host);
  }
}

/**
 * 13.R5 — map HTTP status to the platform catalog code when the throw site
 * did not set one. Only statuses with an unambiguous catalog meaning map;
 * everything else falls back to UNKNOWN_ERROR (the message is always preserved).
 */
const STATUS_TO_CODE: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: ERROR_CODES.INVALID_INPUT,
  [HttpStatus.UNAUTHORIZED]: ERROR_CODES.AUTHENTICATION_REQUIRED,
  [HttpStatus.FORBIDDEN]: ERROR_CODES.INSUFFICIENT_PERMISSION,
  [HttpStatus.NOT_FOUND]: ERROR_CODES.NOT_FOUND,
  [HttpStatus.CONFLICT]: ERROR_CODES.DUPLICATE_TRANSACTION,
  [HttpStatus.TOO_MANY_REQUESTS]: ERROR_CODES.RATE_LIMITED,
  [HttpStatus.BAD_GATEWAY]: ERROR_CODES.SERVICE_UNAVAILABLE,
  [HttpStatus.SERVICE_UNAVAILABLE]: ERROR_CODES.SERVICE_UNAVAILABLE,
  [HttpStatus.GATEWAY_TIMEOUT]: ERROR_CODES.SERVICE_UNAVAILABLE,
};

/**
 * Normalize an HttpException body to the platform {code,message} envelope.
 * Returns null when the body is already normalized (no rewrite needed).
 * - string bodies: a known catalog code stays as both code and message
 *   (e.g. `throw new ConflictException('slot_taken')`); anything else maps
 *   the status to a catalog code and keeps the string as the message.
 * - object bodies: ValidationPipe `{message: string[]}` arrays are joined;
 *   legacy `{status, error}` shapes keep `error` as the message with a
 *   status-mapped code; any other field is kept under `details`.
 */
/** Fields of an error body that the envelope itself carries (not details). */
const ENVELOPE_KEYS = new Set(['code', 'error_code', 'message', 'error', 'statusCode', 'details']);

export function normalizeHttpExceptionBody(
  status: number,
  response: unknown,
): { code: string; message: string; details?: Record<string, unknown> } | null {
  if (typeof response === 'string') {
    if (isErrorCode(response)) return { code: response, message: response };
    return { code: STATUS_TO_CODE[status] ?? 'UNKNOWN_ERROR', message: response };
  }
  if (response && typeof response === 'object') {
    const body = response as Record<string, unknown>;
    const rawMessage = Array.isArray(body.message)
      ? (body.message as unknown[]).map(String).join('; ')
      : body.message ?? body.error;
    if (typeof body.code === 'string' && typeof rawMessage === 'string') return null;
    const message = typeof rawMessage === 'string' ? rawMessage : 'Unknown error';
    const code =
      typeof body.code === 'string'
        ? body.code
        : typeof body.error_code === 'string'
          ? body.error_code
        : isErrorCode(message)
          ? message
          : (STATUS_TO_CODE[status] ?? 'UNKNOWN_ERROR');
    // Keep the throw site's extra fields (e.g. { kind, domain_state }) for clients.
    const extra = Object.fromEntries(Object.entries(body).filter(([k]) => !ENVELOPE_KEYS.has(k)));
    const given = body.details && typeof body.details === 'object' ? (body.details as Record<string, unknown>) : {};
    const details = { ...given, ...extra };
    return Object.keys(details).length ? { code, message, details } : { code, message };
  }
  return { code: STATUS_TO_CODE[status] ?? 'UNKNOWN_ERROR', message: 'Unknown error' };
}

/** `ar` when the request prefers Arabic, else `en` (the catalog's two locales). */
function requestLocale(request: { headers?: Record<string, unknown> } | undefined): 'ar' | 'en' {
  const lang = request?.headers?.['accept-language'];
  return typeof lang === 'string' && /^\s*ar\b/i.test(lang) ? 'ar' : 'en';
}

/**
 * 13.R5: a body whose code is in the error catalog gets `error_code` and the
 * catalog's localized `nextStep`; the throw site's message and any other
 * field are kept. Codes outside the catalog (e.g. `slot_taken`) are unchanged.
 */
export function withCatalogNextStep(body: Record<string, unknown>, locale: 'ar' | 'en'): Record<string, unknown> {
  const code = body.code;
  if (typeof code !== 'string' || !isCatalogCode(code) || typeof body.nextStep === 'string') return body;
  const details = body.details && typeof body.details === 'object' ? (body.details as Record<string, unknown>) : undefined;
  const message = typeof body.message === 'string' ? body.message : undefined;
  return { ...body, ...buildPlatformError(code, { locale, message, details }) };
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
  if (err.name === 'CastError') {
    return new HttpException('Not Found', HttpStatus.NOT_FOUND);
  }
  // Direct `new ObjectId(badInput)` throws BSONError (not CastError) — same semantics.
  if (err.name === 'BSONError') {
    return new HttpException('Not Found', HttpStatus.NOT_FOUND);
  }
  if (err.name === 'ValidationError') {
    return new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
  }
  if (err.name === 'MongoServerError' && err.code === 11000) {
    return new HttpException('Conflict', HttpStatus.CONFLICT);
  }
  return null;
}
