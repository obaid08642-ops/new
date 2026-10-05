/**
 * P15.1 — every failure the network layer can produce, mapped onto the 13.R5
 * error catalog.
 *
 * The catalog itself is owned by `backend/src/common/error-catalog.ts` and its
 * localized copy lives per-locale in `messages/<locale>.json` under `Errors.*`
 * (13 codes + `UNKNOWN_ERROR`). This module owns the CLIENT-side mapping only:
 *
 *   - an HTTP status becomes a catalog code, unless the body already carries one
 *     (the BFF passes `code`/`error_code` through verbatim — see
 *     `lib/api/error-response.ts`), in which case the server wins;
 *   - a transport failure the server never saw (offline, timeout, DNS/TCP
 *     error) is mapped onto the closest catalog code and carries an explicit
 *     `action`, which is what the UI turns into "retry" / "check your
 *     connection" / "contact support".
 *
 * Nothing here formats text. Localization happens at render time, where the
 * locale actually is; see `catalog.ts`.
 */

export const CATALOG_CODES = [
  "AUTHENTICATION_REQUIRED",
  "INSUFFICIENT_PERMISSION",
  "PRESCRIPTION_REQUIRED",
  "NO_AVAILABILITY",
  "SERVICE_UNAVAILABLE",
  "PROVIDER_NOT_AVAILABLE",
  "PRODUCT_OUT_OF_STOCK",
  "PAYMENT_REQUIRED",
  "INSURANCE_NOT_SUPPORTED",
  "LOCATION_NOT_SUPPORTED",
  "DUPLICATE_TRANSACTION",
  "INVALID_INPUT",
  "RATE_LIMITED",
  "UNKNOWN_ERROR",
] as const;

export type CatalogCode = (typeof CATALOG_CODES)[number];

/** What the person in front of the screen can actually do next. */
export type NextStepAction =
  | "retry"
  | "check_connection"
  | "contact_support"
  | "sign_in"
  | "wait"
  | "none";

/**
 * Which layer produced the failure. Needed because the catalog entry for
 * `SERVICE_UNAVAILABLE` ("the service is temporarily unavailable") is the wrong
 * sentence when the user's own connection died.
 */
export type FailureReason = "offline" | "timeout" | "network" | "status" | "unknown";

export function isCatalogCode(value: unknown): value is CatalogCode {
  return typeof value === "string" && (CATALOG_CODES as readonly string[]).includes(value);
}

export class ApiError extends Error {
  readonly code: CatalogCode;
  readonly action: NextStepAction;
  readonly reason: FailureReason;
  readonly status: number | undefined;
  readonly retryable: boolean;
  /** `Errors.<code>` — where the localized message and next step live. */
  readonly catalogKey: string;

  constructor(
    code: CatalogCode,
    action: NextStepAction,
    message: string,
    options: { status?: number; retryable?: boolean; reason?: FailureReason; cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ApiError";
    this.code = code;
    this.action = action;
    this.reason = options.reason ?? "status";
    this.status = options.status;
    this.retryable = options.retryable ?? false;
    this.catalogKey = `Errors.${code}`;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/**
 * A caller-cancelled request (screen closed, component unmounted) is not a
 * failure to report. It is rethrown as the abort reason so `useEffect` cleanup
 * does not light up an error state.
 */
export function isAbortError(value: unknown): boolean {
  if (value instanceof ApiError && value.code === "UNKNOWN_ERROR") return false;
  return Boolean(value) && typeof value === "object" && (value as { name?: string }).name === "AbortError";
}

const STATUS_CODES: Record<number, { code: CatalogCode; action: NextStepAction }> = {
  400: { code: "INVALID_INPUT", action: "retry" },
  401: { code: "AUTHENTICATION_REQUIRED", action: "sign_in" },
  402: { code: "PAYMENT_REQUIRED", action: "contact_support" },
  403: { code: "INSUFFICIENT_PERMISSION", action: "contact_support" },
  404: { code: "SERVICE_UNAVAILABLE", action: "retry" },
  408: { code: "SERVICE_UNAVAILABLE", action: "retry" },
  409: { code: "DUPLICATE_TRANSACTION", action: "contact_support" },
  422: { code: "INVALID_INPUT", action: "retry" },
  429: { code: "RATE_LIMITED", action: "wait" },
  500: { code: "SERVICE_UNAVAILABLE", action: "retry" },
  502: { code: "SERVICE_UNAVAILABLE", action: "retry" },
  503: { code: "SERVICE_UNAVAILABLE", action: "retry" },
  504: { code: "SERVICE_UNAVAILABLE", action: "retry" },
};

/**
 * A body code wins over the status only when it is a real catalog code; the BFF
 * also forwards lower_snake aliases (`slot_taken`) which this app has no copy
 * for, so an unknown alias must fall back to the status mapping.
 */
export function catalogEntryFor(status: number, bodyCode?: unknown): { code: CatalogCode; action: NextStepAction } {
  if (isCatalogCode(bodyCode)) {
    const byStatus = STATUS_CODES[status];
    return { code: bodyCode, action: byStatus ? byStatus.action : "retry" };
  }
  return STATUS_CODES[status] ?? { code: "UNKNOWN_ERROR", action: "contact_support" };
}

/** Reads `code` / `error_code` out of an error body without trusting its shape. */
export function readBodyCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  const root = payload as Record<string, unknown>;
  const raw = root.code ?? root.error_code;
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

export function apiErrorFromStatus(status: number, bodyCode?: unknown, bodyMessage?: string): ApiError {
  const { code, action } = catalogEntryFor(status, bodyCode);
  return new ApiError(code, action, bodyMessage || `request_failed_${status}`, {
    status,
    retryable: false,
    reason: "status",
  });
}

/** The browser knows it has no network. Say so instead of hanging. */
export function offlineError(cause?: unknown): ApiError {
  return new ApiError("SERVICE_UNAVAILABLE", "check_connection", "offline", {
    cause,
    reason: "offline",
  });
}

/** The attempt blew its 15 s / 60 s / 45 s budget. */
export function timeoutError(cause?: unknown): ApiError {
  return new ApiError("SERVICE_UNAVAILABLE", "retry", "request_timeout", {
    cause,
    retryable: true,
    reason: "timeout",
  });
}

/** A `TypeError` from `fetch`: DNS, TLS, refused connection, CORS. */
export function networkError(cause?: unknown): ApiError {
  return new ApiError("SERVICE_UNAVAILABLE", "check_connection", "network_error", {
    cause,
    retryable: true,
    reason: "network",
  });
}
