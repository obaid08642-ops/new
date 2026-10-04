import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Phase 20 foundation — request-id propagation (ADDITIVE ONLY, not wired).
 *
 * Reads/generates `x-request-id`, attaches it to the request object and
 * echoes it on the response header so clients can correlate logs.
 *
 * NOTE: this codebase has no AsyncLocalStorage / CLS context (verified
 * 2026-09), so the id lives on the request object. If an async context is
 * introduced later, store the id there inside `use()` — `getRequestId()`
 * stays the single read path for loggers.
 *
 * WIRING (owned by a sibling — DO NOT wire here):
 *   // Option A — module-level (preferred):
 *   //   consumer.apply(RequestIdMiddleware).forRoutes('*');
 *   // Option B — global (in main.ts, sibling-owned file — do not touch):
 *   //   app.use(requestIdFunction);
 *
 * Kept distinct from CorrelationMiddleware (`x-correlation-id`): that
 * middleware owns cross-service correlation; this one owns per-request
 * identity used by the structured logger (`structured-logger.ts`).
 */

export const REQUEST_ID_HEADER = 'x-request-id';
export const MAX_REQUEST_ID_LENGTH = 128;

/** Characters safe to echo into a response header and log lines. */
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9._~:|-]+$/;

function normalizeIncoming(raw: unknown): string | undefined {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (typeof first !== 'string') return undefined;
  const trimmed = first.trim();
  if (!trimmed || trimmed.length > MAX_REQUEST_ID_LENGTH) return undefined;
  // Reject CRLF / control chars / delimiters to block response-header injection.
  if (!SAFE_REQUEST_ID_PATTERN.test(trimmed)) return undefined;
  return trimmed;
}

export function resolveRequestId(req: Request): string {
  return normalizeIncoming(req.headers[REQUEST_ID_HEADER]) ?? uuidv4();
}

/**
 * Single read path for the request id. Prefers the id set by this
 * middleware, falls back to the legacy `correlationId` so logs stay
 * joinable on routes where only CorrelationMiddleware ran.
 */
export function getRequestId(req: Request | Record<string, unknown> | undefined): string | undefined {
  const bag = req as unknown as Record<string, unknown> | undefined;
  const direct = bag?.['requestId'];
  if (typeof direct === 'string' && direct) return direct;
  const legacy = bag?.['correlationId'];
  if (typeof legacy === 'string' && legacy) return legacy;
  return undefined;
}

/** Plain Express-style function for `app.use(...)` wiring (sibling-owned). */
export function requestIdFunction(req: Request, res: Response, next: NextFunction): void {
  const requestId = resolveRequestId(req);
  (req as unknown as Record<string, unknown>)['requestId'] = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    requestIdFunction(req, res, next);
  }
}
