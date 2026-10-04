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

// WIRING (deferred — intentionally NOT registered globally by this task):
//   @UseInterceptors(IdempotencyKeyInterceptor) // on the write controller, or
//   { provide: APP_INTERCEPTOR, useClass: IdempotencyKeyInterceptor } // global (needs module edit)
// Pick per-controller wiring first; global registration changes every POST contract.

interface KeyedRequest {
  method?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  user?: { id?: unknown };
  body?: unknown;
  originalUrl?: unknown;
  url?: unknown;
  __idempotencyKeyHandled?: boolean;
}

function headerValue(headers: Record<string, string | string[] | undefined> | undefined, name: string): string | undefined {
  const raw = headers?.[name];
  return Array.isArray(raw) ? raw[0] : raw;
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
    if (request.__idempotencyKeyHandled) return next.handle();
    request.__idempotencyKeyHandled = true;

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
      const replayed = cached.response;
      if (replayed !== null && typeof replayed === 'object' && !Array.isArray(replayed)) {
        return of({ ...(replayed as Record<string, unknown>), idempotent_replay: true });
      }
      return of(replayed);
    }

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
