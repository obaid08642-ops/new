import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request-id resolution used by CorrelationMiddleware (the middleware wired
 * for every route in app.module.ts). The id lives on the request object.
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

export const LEGACY_CORRELATION_HEADER = 'x-correlation-id';

export function resolveRequestId(req: Request): string {
  return normalizeIncoming(req.headers[REQUEST_ID_HEADER])
    ?? normalizeIncoming(req.headers[LEGACY_CORRELATION_HEADER])
    ?? uuidv4();
}
