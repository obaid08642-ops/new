import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { PUBLIC_CACHE_KEY } from './public-cache.decorator';
import { PUBLIC_KEY } from '../auth.guard';
import {
  ROUTE_CACHE_MAX_TAGS,
  ROUTE_CACHE_MAX_TTL_SECONDS,
  type PublicCacheOptions,
} from './public-cache.decorator';

const TAG_RE = /^[a-z0-9][a-z0-9:_-]{0,63}$/i;
const STALE_WHILE_REVALIDATE_SECONDS = 60;
const STALE_IF_ERROR_SECONDS = 86400;
const VARY_BASE = 'Accept-Encoding, Authorization, Cookie';

/** Runtime re-validation: raw SetMetadata bypassing the decorator must fail closed. */
function cleanTags(tags: unknown): string[] | undefined {
  if (tags === undefined) return undefined;
  if (!Array.isArray(tags) || tags.length < 1 || tags.length > ROUTE_CACHE_MAX_TAGS) return undefined;
  for (const t of tags) {
    if (typeof t !== 'string' || !TAG_RE.test(t)) return undefined;
  }
  return [...tags] as string[];
}

/**
 * 14.7 route cache-policy interceptor (hardens X0 `CacheControlInterceptor`).
 *
 * - Non-GET: `no-store, no-cache, must-revalidate`.
 * - GET default: `private, no-store` (+ `X-Cache-Hint: private`).
 * - Public shared-cache headers ONLY when ALL hold: `@Public()` +
 *   `@PublicCache` metadata with valid ttl/tags + GET + no `Authorization`
 *   header + no session cookie + no `req.user` (14.7 hardening beyond X0:
 *   fails closed even if auth arrived via cookie-session/guard ordering).
 * - `Vary: Accept-Language` ONLY when the route opted in via
 *   `@PublicCache(ttl, tags, { varyLanguage: true })`.
 * - Error responses are always `private, no-store`.
 *
 * Registered globally as APP_INTERCEPTOR in app.module.ts.
 */
@Injectable()
export class RouteCachePolicyInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    if (req.method !== 'GET') {
      res.setHeader?.('Cache-Control', 'no-store, no-cache, must-revalidate');
      return next.handle();
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const meta = this.reflector.getAllAndOverride<PublicCacheOptions | undefined>(PUBLIC_CACHE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const headers = (req.headers ?? {}) as Record<string, unknown>;
    const hasAuthHeader = !!(headers['authorization'] ?? headers['Authorization']);
    const hasCookie = !!(headers['cookie'] ?? headers['Cookie']);
    const hasUser = !!((req as { user?: unknown })?.user);

    const ttl = meta?.ttlSeconds;
    const ttlOk =
      typeof ttl === 'number' &&
      Number.isInteger(ttl) &&
      ttl >= 1 &&
      ttl <= ROUTE_CACHE_MAX_TTL_SECONDS;
    const tags = cleanTags(meta?.tags);
    const tagsOk = meta?.tags === undefined || tags !== undefined;

    const grant = !!isPublic && !!meta && ttlOk && tagsOk && !hasAuthHeader && !hasCookie && !hasUser;
    const varyLanguage = grant && (meta as PublicCacheOptions)?.varyLanguage === true;

    return next.handle().pipe(
      tap(() => {
        if (grant && typeof ttl === 'number') {
          res.setHeader?.(
            'Cache-Control',
            `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}, stale-if-error=${STALE_IF_ERROR_SECONDS}`,
          );
          res.setHeader?.('Vary', varyLanguage ? `${VARY_BASE}, Accept-Language` : VARY_BASE);
          if (tags?.length) {
            res.setHeader?.('Cache-Tag', tags.join(','));
          }
          res.setHeader?.('X-Cache-Hint', 'public');
        } else {
          res.setHeader?.('Cache-Control', 'private, no-store');
          res.setHeader?.('X-Cache-Hint', 'private');
        }
      }),
      catchError((err: unknown) => {
        res.setHeader?.('Cache-Control', 'private, no-store');
        res.setHeader?.('X-Cache-Hint', 'private');
        return throwError(() => err);
      }),
    );
  }
}
