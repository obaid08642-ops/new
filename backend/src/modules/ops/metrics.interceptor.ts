import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { RedisService } from '../redis/redis.service';

/**
 * Platform-wide request telemetry — every API call is counted by path and by
 * status class (2xx/4xx/5xx) into daily Redis hashes (14-day retention).
 * Powers the admin Operations Center: most-used endpoints, error rates,
 * success/failure split — "من زار ماذا وكم مرة وهل نجح أم فشل".
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly redis: RedisService) {}

  /** Collapse path params (ids/uuids) so hashes stay low-cardinality. */
  private normalize(path: string): string {
    return (path || '/')
      .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id') // uuid
      .replace(/[0-9a-f]{24}/gi, ':id')                // mongo objectId
      .replace(/\/\d{3,}(?=\/|$)/g, '/:id')            // long numeric ids
      .slice(0, 180);
  }

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    if (ctx.getType() !== 'http') return next.handle();
    const req = ctx.switchToHttp().getRequest();
    const res = ctx.switchToHttp().getResponse();
    const path = this.normalize(req.path || req.url || '/');
    const day = new Date().toISOString().slice(0, 10);
    const reqKey = `ops:req:${day}`;
    const stKey = `ops:status:${day}`;

    const record = (statusCode: number) => {
      try {
        const client = (this.redis as any).getClient?.();
        if (!client) return;
        const klass = statusCode >= 500 ? '5xx' : statusCode >= 400 ? '4xx' : '2xx';
        const pipe = client.multi();
        pipe.hincrby(reqKey, path, 1);
        pipe.hincrby(stKey, klass, 1);
        pipe.hincrby(stKey, `${klass}:${path}`, 1);
        pipe.expire(reqKey, 14 * 86400);
        pipe.expire(stKey, 14 * 86400);
        pipe.exec().catch(() => {});
      } catch { /* telemetry must never break requests */ }
    };

    return next.handle().pipe(
      tap({
        next: () => record(res.statusCode || 200),
        error: (err) => record(err?.status || err?.statusCode || 500),
      }),
    );
  }
}
