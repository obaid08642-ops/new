/**
 * 15.1 — the typed error every network failure is reported as.
 *
 * Design note on `message`: it stays the *stable machine token* the existing app
 * and its tests already branch on (`OFFLINE_ERROR`, `REQUEST_ABORTED`,
 * `AUTH_ERROR_401: …`). The human-facing Arabic/English sentence lives in
 * `userMessage` and the instruction in `nextStep`, both resolved from the 13.R5
 * catalogue. Overwriting `message` with a localized sentence would have broken
 * every `catch (e) { e.message === 'AUTH_ERROR_401' }` in the 170 call sites and
 * every test asserting on those tokens, so the tokens stay and the catalogue is
 * additive.
 */
import { catalogCodeForStatus, lookupCatalogEntry, normalizeCatalogCode } from './errorCatalog';
import type { BackendErrorCode } from './errorCatalog';

/** Mirrors `AppErrorCode` in `src/services/ErrorHandler.tsx` without importing it. */
export type TransportErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'AUTH_ERROR'
  | 'FORBIDDEN_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR'
  | 'OFFLINE_ERROR'
  | 'CANCELLED_ERROR';

export const OFFLINE_TOKEN = 'OFFLINE_ERROR';
export const ABORTED_TOKEN = 'REQUEST_ABORTED';
export const TIMEOUT_TOKEN = 'TIMEOUT_ERROR';

export interface ApiErrorInit {
  code: TransportErrorCode;
  /** Stable machine token; also what `message` is set to. */
  reason: string;
  catalogCode: BackendErrorCode;
  status?: number | null;
  locale?: string | null;
  /** Server-provided overrides for the catalogue message / next step. */
  serverMessage?: string;
  serverNextStep?: string;
  details?: Record<string, unknown>;
  originalError?: unknown;
  /** True when the request never reached the server. */
  transportFailure?: boolean;
}

export class ApiError extends Error {
  readonly code: TransportErrorCode;
  readonly reason: string;
  readonly catalogCode: BackendErrorCode;
  readonly status?: number | null;
  readonly locale: string;
  readonly userMessage: string;
  readonly nextStep: string;
  readonly details?: Record<string, unknown>;
  readonly originalError?: unknown;
  readonly transportFailure: boolean;

  constructor(init: ApiErrorInit) {
    super(init.reason);
    this.name = 'ApiError';
    this.code = init.code;
    this.reason = init.reason;
    this.catalogCode = init.catalogCode;
    this.status = init.status ?? null;
    this.locale = init.locale ?? 'ar';
    this.details = init.details;
    this.originalError = init.originalError;
    this.transportFailure = init.transportFailure === true;

    const entry = lookupCatalogEntry(init.catalogCode, this.locale, {
      message: init.serverMessage,
      nextStep: init.serverNextStep,
    });
    this.userMessage = entry.message;
    this.nextStep = entry.nextStep;
  }

  /** `{code, message, nextStep}` envelope — the shape the backend emits. */
  toCatalogEnvelope(): { code: BackendErrorCode; message: string; nextStep: string } {
    return { code: this.catalogCode, message: this.userMessage, nextStep: this.nextStep };
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** Read a backend `{code|error_code,message,nextStep,details}` envelope off any thrown value. */
export function readServerErrorEnvelope(input: unknown): {
  catalogCode: BackendErrorCode | null;
  rawCode?: string;
  message?: string;
  nextStep?: string;
  details?: Record<string, unknown>;
} {
  const candidates: unknown[] = [];
  if (input && typeof input === 'object') {
    const rec = input as Record<string, unknown>;
    if (rec.response && typeof rec.response === 'object') {
      candidates.push((rec.response as Record<string, unknown>).data);
    }
    if (rec.data && typeof rec.data === 'object') candidates.push(rec.data);
    candidates.push(input);
  }
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const body = candidate as Record<string, unknown>;
    const raw = body.code ?? body.error_code;
    const message = typeof body.message === 'string' ? body.message : undefined;
    const nextStep = typeof body.nextStep === 'string' ? body.nextStep : undefined;
    const details =
      body.details && typeof body.details === 'object'
        ? (body.details as Record<string, unknown>)
        : undefined;
    const normalized = normalizeCatalogCode(raw);
    if (normalized) return { catalogCode: normalized, rawCode: String(raw).trim(), message, nextStep, details };
    // An unrecognised code with a real server message is still useful: keep the
    // message, surface it as UNKNOWN_ERROR rather than inventing catalogue text.
    if (typeof raw === 'string' && raw.trim() && message) {
      return { catalogCode: 'UNKNOWN_ERROR', rawCode: raw.trim(), message, nextStep, details };
    }
    if (message || nextStep || details) {
      return { catalogCode: null, rawCode: undefined, message, nextStep, details };
    }
  }
  return { catalogCode: null };
}

const CATALOG_TO_TRANSPORT: Record<BackendErrorCode, TransportErrorCode> = {
  AUTHENTICATION_REQUIRED: 'AUTH_ERROR',
  INSUFFICIENT_PERMISSION: 'FORBIDDEN_ERROR',
  PRESCRIPTION_REQUIRED: 'VALIDATION_ERROR',
  NO_AVAILABILITY: 'NOT_FOUND_ERROR',
  SERVICE_UNAVAILABLE: 'SERVER_ERROR',
  PROVIDER_NOT_AVAILABLE: 'NOT_FOUND_ERROR',
  PRODUCT_OUT_OF_STOCK: 'NOT_FOUND_ERROR',
  PAYMENT_REQUIRED: 'VALIDATION_ERROR',
  INSURANCE_NOT_SUPPORTED: 'VALIDATION_ERROR',
  LOCATION_NOT_SUPPORTED: 'VALIDATION_ERROR',
  DUPLICATE_TRANSACTION: 'VALIDATION_ERROR',
  INVALID_INPUT: 'VALIDATION_ERROR',
  RATE_LIMITED: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

export function transportCodeForCatalog(code: BackendErrorCode): TransportErrorCode {
  return CATALOG_TO_TRANSPORT[code] ?? 'UNKNOWN_ERROR';
}

/**
 * Normalize NestJS validation arrays / objects into one readable string. The old
 * client called `.toLowerCase()` on whatever `message` was, which crashed on the
 * array shape NestJS returns for a 400.
 */
export function coerceServerMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const parts = value.map((entry) => coerceServerMessage(entry)).filter(Boolean);
    return parts.length ? parts.join('، ') : undefined;
  }
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    if (typeof rec.message === 'string') return rec.message;
    return undefined;
  }
  return undefined;
}

/**
 * Build the single error type the whole app sees, from whatever the transport
 * produced. `status` is null/0 for a transport failure.
 */
export function toApiError(input: {
  status?: number | null;
  /** Raw server message; may be a string, a NestJS validation array, or an object. */
  serverMessage?: unknown;
  /** The server's own `code` / `error_code`, which wins over the status-derived one. */
  serverCode?: unknown;
  serverNextStep?: unknown;
  details?: Record<string, unknown>;
  locale?: string | null;
  originalError?: unknown;
  transportFailure?: boolean;
}): ApiError {
  const serverMessage = coerceServerMessage(input.serverMessage);
  const envelope = readServerErrorEnvelope({
    data: { code: input.serverCode, message: serverMessage, nextStep: input.serverNextStep, details: input.details },
  });
  const status = input.status ?? null;
  const catalogCode = envelope.catalogCode ?? catalogCodeForStatus(status ?? 500);

  let reason: string;
  if (input.transportFailure) {
    reason = OFFLINE_TOKEN;
  } else if (status === 401) {
    reason = `AUTH_ERROR_401: ${serverMessage ?? 'unauthorized'}`;
  } else if (status === 403) {
    reason = `AUTH_ERROR_403: ${serverMessage ?? 'forbidden'}`;
  } else {
    reason = serverMessage ?? 'api_error';
  }

  return new ApiError({
    code: transportCodeForCatalog(catalogCode),
    reason,
    catalogCode,
    status,
    locale: input.locale ?? 'ar',
    serverMessage,
    serverNextStep:
      typeof input.serverNextStep === 'string' ? input.serverNextStep : envelope.nextStep,
    details: input.details ?? envelope.details,
    originalError: input.originalError,
    transportFailure: input.transportFailure,
  });
}

export function offlineError(locale?: string | null, originalError?: unknown): ApiError {
  return new ApiError({
    code: 'OFFLINE_ERROR',
    reason: OFFLINE_TOKEN,
    catalogCode: 'UNKNOWN_ERROR',
    locale,
    originalError,
    transportFailure: true,
  });
}

export function timeoutError(timeoutMs: number, locale?: string | null): ApiError {
  return new ApiError({
    code: 'TIMEOUT_ERROR',
    reason: TIMEOUT_TOKEN,
    catalogCode: 'SERVICE_UNAVAILABLE',
    locale,
    details: { timeoutMs },
    transportFailure: true,
  });
}

export function cancelledError(locale?: string | null, originalError?: unknown): ApiError {
  return new ApiError({
    code: 'CANCELLED_ERROR',
    reason: ABORTED_TOKEN,
    catalogCode: 'UNKNOWN_ERROR',
    locale,
    originalError,
    transportFailure: true,
  });
}

/**
 * Human-facing sentence + instruction for anything that was thrown, whatever
 * produced it. Screens call this instead of inventing their own strings, which
 * is what "every error mapped to the catalogue with a localized message and a
 * next step" means in practice.
 */
export function describeError(error: unknown, locale?: string | null): { message: string; nextStep: string } {
  if (isApiError(error)) return { message: error.userMessage, nextStep: error.nextStep };
  const envelope = readServerErrorEnvelope(error);
  if (envelope.catalogCode) {
    const entry = lookupCatalogEntry(envelope.catalogCode, locale ?? 'ar', {
      message: envelope.message,
      nextStep: envelope.nextStep,
    });
    return { message: entry.message, nextStep: entry.nextStep };
  }
  const fallback = lookupCatalogEntry('UNKNOWN_ERROR', locale ?? 'ar');
  return { message: fallback.message, nextStep: fallback.nextStep };
}
