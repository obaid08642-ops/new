import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import {
  IDEMPOTENCY_MAX_KEY_LENGTH,
  IdempotencyKeyStore,
  buildIdempotencyKey,
  hashRequestBody,
} from './idempotency-key.store';

// WIRING: this is the single write-path idempotency protocol. It runs
// globally via IdempotencyInterceptor (../idempotency.interceptor.ts — the
// global APP_INTERCEPTOR, a subclass of this class), and may additionally be
// applied per-controller via @UseInterceptors. Every instance honours BOTH
// per-request markers, so any mix of global + explicit wiring processes a
// request exactly once and can never self-conflict (409) on the first lock.

interface KeyedRequest {
  method?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  user?: { id?: unknown };
  body?: unknown;
  originalUrl?: unknown;
  url?: unknown;
  /** Set by the global IdempotencyInterceptor (superclass wiring). */
  __idempotencyHandled?: boolean;
  /** Set by this interceptor (per-controller wiring). */
  __idempotencyKeyHandled?: boolean;
}

function headerValue(headers: Record<string, string | string[] | undefined> | undefined, name: string): string | undefined {
  const raw = headers?.[name];
  return Array.isArray(raw) ? raw[0] : raw;
}

/** Replay marker: object responses carry `idempotent_replay: true`; scalars pass through as-is. */
function replayWithFlag(replayed: unknown): unknown {
  if (replayed !== null && typeof replayed === 'object' && !Array.isArray(replayed)) {
    return { ...(replayed as Record<string, unknown>), idempotent_replay: true };
  }
  return replayed;
}

/**
 * Write-path idempotency: dedupes concurrent + replayed POST/PATCH/DELETE
 * via Redis (lock NX 120s, response TTL 24h). Replays return the original
 * response with `idempotent_replay: true` and never re-execute the handler.
 */
@Injectable()
export class IdempotencyKeyInterceptor implements NestInterceptor {
  constructor(private readonly store: IdempotencyKeyStore) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest() as KeyedRequest;
    // 15.2 merge: the two historical interceptors used different markers for
    // the same Redis key, so a request passing through BOTH (global + explicit
    // wiring) saw the first instance's lock as a conflict and answered 409 on
    // every keyed write. Both markers are honoured and set together, so any
    // instance that already processed the request lets the other pass through.
    if (request.__idempotencyKeyHandled || request.__idempotencyHandled) return next.handle();
    request.__idempotencyKeyHandled = true;
    request.__idempotencyHandled = true;

    const method = typeof request.method === 'string' ? request.method : '';
    if (method !== 'POST' && method !== 'PATCH' && method !== 'DELETE') return next.handle();

    const clientKey = headerValue(request.headers, 'idempotency-key');
    if (!clientKey) return next.handle();
    if (clientKey.length === 0 || clientKey.length > IDEMPOTENCY_MAX_KEY_LENGTH) {
      throw new BadRequestException('invalid_idempotency_key');
    }

    const userId = typeof request.user?.id === 'string' ? request.user.id : '';
    if (!userId) return next.handle();

    const path = typeof request.originalUrl === 'string'
      ? request.originalUrl
      : typeof request.url === 'string'
        ? request.url
        : '';
    const recordKey = buildIdempotencyKey(userId, method, path, clientKey);
    const requestHash = hashRequestBody(request.body);

    const cached = await this.store.findResponse(recordKey);
    if (cached) {
      if (cached.request_hash !== requestHash) {
        throw new BadRequestException('idempotency_key_reused_with_different_request');
      }
      return of(replayWithFlag(cached.response));
    }

    // Pre-shape records (no request_hash) are replayed, never re-executed:
    // they were scoped by the same user/method/path/key when written.
    const legacy = await this.store.findLegacyResponse(recordKey);
    if (legacy.found) return of(replayWithFlag(legacy.response));

    const locked = await this.store.acquireLock(recordKey);
    if (!locked) throw new ConflictException('idempotency_request_in_progress');

    return next.handle().pipe(
      mergeMap(async (response: unknown) => {
        await this.store.saveResponse(recordKey, requestHash, response);
        return response;
      }),
      catchError((error: unknown) => {
        return new Observable<unknown>((subscriber) => {
          this.store
            .releaseLock(recordKey)
            .finally(() => subscriber.error(error));
        });
      }),
    );
  }
}
