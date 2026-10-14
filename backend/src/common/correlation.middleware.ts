import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { MetricsService, normaliseRoute } from './metrics.service';
import { runWithLogContext } from './structured-logger';

/**
 * Phase 20.1 / 20.2 / 20.3 — one request id end to end, one metric per
 * request, and every log line inside the request carrying that id.
 *
 * The id is taken from the caller's `x-correlation-id` when there is one, so a
 * request that starts at the web BFF keeps the same id all the way into the API
 * (20.1). It is echoed back on the response so a user can quote it in a
 * support request.
 */
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly metrics?: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.headers['x-correlation-id'];
    const requestId = (Array.isArray(incoming) ? incoming[0] : incoming) || uuidv4();
    req['correlationId'] = requestId;
    res.setHeader('X-Correlation-ID', requestId);

    const startedAt = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      const route = normaliseRoute(req.route?.path ? String((req as any).route.path) : req.originalUrl || req.url);
      this.metrics?.record(route, res.statusCode, durationMs);
      this.logger.log(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: res.statusCode >= 500 ? 'error' : 'info',
          event: 'http_request',
          request_id: requestId,
          method: req.method,
          route,
          status: res.statusCode,
          duration_ms: durationMs,
          content_length: Number(res.get('content-length') || 0),
        }),
      );
    });

    // Everything downstream runs inside this context, so a log line from deep
    // in a service still knows which request it belongs to (20.3).
    runWithLogContext({ requestId }, () => next());
  }
}