export const CONTRACT_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  IDEMPOTENCY_REPLAY: 'IDEMPOTENCY_REPLAY',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
} as const;

export type ContractErrorCode = (typeof CONTRACT_ERROR_CODES)[keyof typeof CONTRACT_ERROR_CODES];

export type ContractErrorPayload = {
  code: ContractErrorCode;
  message: string;
  details?: Record<string, string | number | boolean | null>;
};

export function contractError(
  code: ContractErrorCode,
  message: string,
  details?: ContractErrorPayload['details'],
): ContractErrorPayload {
  return details ? { code, message, details } : { code, message };
}
