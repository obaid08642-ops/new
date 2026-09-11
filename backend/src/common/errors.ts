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
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export function platformError(code: ErrorCode, message?: string, details?: Record<string, unknown>) {
  return { error_code: code, message: message || code, ...(details ? { details } : {}) };
}
