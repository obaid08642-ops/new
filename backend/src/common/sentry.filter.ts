import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import { ERROR_CODES, isErrorCode } from './errors';
import { generateErrorId, createErrorResponse } from './error-id';

@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // Generate error ID for tracking
    const errorId = generateErrorId();

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
      const normalized = normalizeHttpExceptionBody(exception.getStatus(), exception.getResponse());
      if (normalized) {
        exception = new HttpException(normalized, exception.getStatus());
      }
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

    // In production, return generic error with error ID; never expose stack traces or internal details
    if (process.env.NODE_ENV === 'production') {
      const errorResponse = createErrorResponse(errorId, status);
      response.status(status).json(errorResponse);
      return;
    }

    // Non-production: pass through with enhanced error info including errorId
    if (exception instanceof HttpException) {
      const responseBody = exception.getResponse();
      if (typeof responseBody === 'object' && responseBody !== null) {
        (responseBody as Record<string, unknown>).errorId = errorId;
      }
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
 *   status-mapped code.
 */
export function normalizeHttpExceptionBody(
  status: number,
  response: unknown,
): { code: string; message: string } | null {
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
        : isErrorCode(message)
          ? message
          : (STATUS_TO_CODE[status] ?? 'UNKNOWN_ERROR');
    return { code, message };
  }
  return { code: STATUS_TO_CODE[status] ?? 'UNKNOWN_ERROR', message: 'Unknown error' };
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
