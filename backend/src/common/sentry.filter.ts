import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';

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

    super.catch(exception, host);
  }
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
  if (err.name === 'ValidationError') {
    return new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
  }
  if (err.name === 'MongoServerError' && err.code === 11000) {
    return new HttpException('Conflict', HttpStatus.CONFLICT);
  }
  return null;
}
