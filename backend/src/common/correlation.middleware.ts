import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { MetricsService, normaliseRoute } from './metrics.service';
import { logEvent, runWithLogContext } from './structured-logger';

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
  constructor(private readonly metrics?: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.headers['x-correlation-id'];
    const supplied = Array.isArray(incoming) ? incoming[0] : incoming;
    // the caller's id is kept only when it is a plain token (it is searched and stored); anything else gets a fresh one
    const requestId = supplied && /^[A-Za-z0-9._:-]{1,128}$/.test(supplied) ? supplied : uuidv4();
    req['correlationId'] = requestId;
    res.setHeader('X-Correlation-ID', requestId);

    const startedAt = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      const route = normaliseRoute(req.route?.path ? String((req as any).route.path) : req.originalUrl || req.url);
      this.metrics?.record(route, res.statusCode, durationMs);
      // finish runs outside the request's async context: put the id (and the caller, known by now) back for this one line
      runWithLogContext({ requestId, userId: (req as any).user?.id ? String((req as any).user.id) : undefined, role: (req as any).user?.role }, () =>
        logEvent(res.statusCode >= 500 ? 'error' : 'info', 'http_request', {
          module: 'http',
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
    // 23.1: where the request came from, for the audit trail. `req.ip` already applies the trust-proxy policy.
    const one = (name: string) => {
      const v = req.headers[name];
      const t = Array.isArray(v) ? v[0] : v;
      return typeof t === 'string' && t ? t : undefined;
    };
    const ua = one('user-agent');
    runWithLogContext(
      {
        requestId,
        ip: typeof req.ip === 'string' ? req.ip.slice(0, 64) : undefined,
        userAgent: ua?.slice(0, 200),
        deviceId: one('x-device-id')?.slice(0, 64),
        platform: (one('x-platform') ?? (ua && /iPhone|iPad|iOS/i.test(ua) ? 'ios' : ua && /Android/i.test(ua) ? 'android' : ua ? 'web' : undefined))?.slice(0, 16),
        appVersion: one('x-app-version')?.slice(0, 32),
      },
      () => next(),
    );
  }
}