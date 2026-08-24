import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { normalizeContractError } from './contract-error-normalizer';

@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

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
      const normalized = normalizeContractError(exception);
      // Never return raw 5xx messages: they may contain provider, database, or stack details.
      ctx.getResponse().status(normalized.status).json(normalized.payload);
      return;
    }

    // Preserve existing 4xx response shapes until each public contract is explicitly migrated.
    super.catch(exception, host);
  }
}
