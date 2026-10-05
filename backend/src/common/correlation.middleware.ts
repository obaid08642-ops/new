import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { resolveRequestId } from './request-id.middleware';
import { logStructured } from './structured-logger';

/**
 * One id per request (20.1/20.3): a safe incoming `x-request-id` (or the
 * legacy `x-correlation-id`) is kept, anything else is replaced by a uuid.
 * The id is echoed on both headers, stored on `req.requestId` /
 * `req.correlationId`, and carried by the JSON access-log record.
 */
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = resolveRequestId(req);
    const bag = req as unknown as Record<string, unknown>;
    bag['requestId'] = requestId;
    bag['correlationId'] = requestId;
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Correlation-ID', requestId);

    const start = Date.now();
    res.on('finish', () => {
      logStructured('info', 'http', 'request', {
        requestId,
        data: {
          method: req.method,
          // Path only: query strings can carry tokens.
          path: (req.originalUrl || req.url || '').split('?')[0],
          status: res.statusCode,
          bytes: Number(res.get('content-length')) || 0,
          ms: Date.now() - start,
          ua: req.get('user-agent') || '',
        },
      });
    });

    next();
  }
}
