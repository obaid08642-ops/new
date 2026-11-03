import { CallHandler, ExecutionContext, GatewayTimeoutException, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, TimeoutError, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { RouteClass, routeClass } from './route-classes';

/**
 * R16: a per-class time budget for READS. A GET that runs past its budget is answered 504 `request_timeout` (+ Retry-After) so the client and the connection are freed instead of
 * waiting for a slow query. Writes (POST/PUT/PATCH/DELETE) get NO timeout on purpose: the handler keeps running after the response is cut, so a client that saw 504 would
 * retry a payment that is still being processed. Streams (SSE, sockets) are never timed out.
 */
export const READ_BUDGET_MS: Record<RouteClass, number> = { payment: 10_000, auth: 10_000, booking: 15_000, search: 5_000, public_read: 5_000, user_read: 10_000, realtime: 0, admin: 30_000, other: 10_000 };
const SSE_METADATA = '__sse__';

@Injectable()
export class RouteTimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    if (req.method !== 'GET' && req.method !== 'HEAD') return next.handle();
    if (Reflect.getMetadata(SSE_METADATA, context.getHandler())) return next.handle();
    const url: string = String(req.originalUrl || req.url || '').split('?')[0];
    if (/\/(?:stream|events|export|download)(?:\/|$)/.test(url)) return next.handle();    // long by nature: streams and file exports
    const ms = READ_BUDGET_MS[routeClass(url)];
    if (!ms) return next.handle();
    return next.handle().pipe(
      timeout({ first: ms }),
      catchError((e) => {
        if (e instanceof TimeoutError) { try { context.switchToHttp().getResponse().setHeader?.('Retry-After', '5'); } catch { /* not HTTP */ } return throwError(() => new GatewayTimeoutException('request_timeout')); }
        return throwError(() => e);
      }),
    );
  }
}
