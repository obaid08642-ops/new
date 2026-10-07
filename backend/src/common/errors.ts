/**
 * Centralized platform error catalog.
 * Every client (Web/Mobile/Provider/Admin/AI/MCP) surfaces these codes —
 * no invented per-client error strings for covered cases.
 */
export const ERROR_CODES = {
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',
  PRESCRIPTION_REQUIRED: 'PRESCRIPTION_REQUIRED',
  RX_VERIFICATION_REQUIRED: 'RX_VERIFICATION_REQUIRED',
  NO_AVAILABILITY: 'NO_AVAILABILITY',
  PROVIDER_NOT_AVAILABLE: 'PROVIDER_NOT_AVAILABLE',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  PRODUCT_OUT_OF_STOCK: 'PRODUCT_OUT_OF_STOCK',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  INSURANCE_NOT_SUPPORTED: 'INSURANCE_NOT_SUPPORTED',
  LOCATION_NOT_SUPPORTED: 'LOCATION_NOT_SUPPORTED',
  DUPLICATE_TRANSACTION: 'DUPLICATE_TRANSACTION',
  INVALID_INPUT: 'INVALID_INPUT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  // R65: booking/slot/lock codes — message strings asserted by specs
  // (slot-locks.service.spec.ts) and consumed by clients; registered here
  // as the single catalog so no per-client inventions diverge.
  SLOT_TAKEN: 'slot_taken',
  LOCK_NOT_FOUND: 'lock_not_found',
  LOCK_NOT_HOLDABLE: 'lock_not_holdable',
  NOT_READY: 'not_ready',
  SUMMARY_NOT_AVAILABLE: 'summary_not_available',
  FOLLOW_UP_OUT_OF_WINDOW: 'follow_up_out_of_window',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * 13.R5 — the 13 platform error codes from the owner error catalog (05 Part B, R5).
 * All clients (Web/Mobile/Provider/Admin/AI/MCP) surface these codes with a
 * localized message per code; see `error-catalog.ts` + `errors.i18n.json`.
 */
export const R5_ERROR_CODES = [
  ERROR_CODES.AUTHENTICATION_REQUIRED,
  ERROR_CODES.INSUFFICIENT_PERMISSION,
  ERROR_CODES.PRESCRIPTION_REQUIRED,
  ERROR_CODES.NO_AVAILABILITY,
  ERROR_CODES.SERVICE_UNAVAILABLE,
  ERROR_CODES.PROVIDER_NOT_AVAILABLE,
  ERROR_CODES.PRODUCT_OUT_OF_STOCK,
  ERROR_CODES.PAYMENT_REQUIRED,
  ERROR_CODES.INSURANCE_NOT_SUPPORTED,
  ERROR_CODES.LOCATION_NOT_SUPPORTED,
  ERROR_CODES.DUPLICATE_TRANSACTION,
  ERROR_CODES.INVALID_INPUT,
  ERROR_CODES.RATE_LIMITED,
] as const;

export type R5ErrorCode = (typeof R5_ERROR_CODES)[number];

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && (Object.values(ERROR_CODES) as string[]).includes(value);
}

export interface PlatformErrorShape {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  nextStep?: string;
  /** Legacy alias of `code` kept for older readers; new code must use `code`. */
  error_code?: string;
}

export function platformError(
  code: ErrorCode,
  message?: string,
  details?: Record<string, unknown>,
  nextStep?: string,
): PlatformErrorShape {
  return {
    code,
    error_code: code,
    message: message || code,
    ...(details ? { details } : {}),
    ...(nextStep ? { nextStep } : {}),
  };
}
