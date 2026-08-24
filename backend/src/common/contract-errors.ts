export const CONTRACT_ERROR_CODES = {
  VALIDATION_ERROR: 'validation_error',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  PAYMENT_REQUIRED: 'payment_required',
  PROVIDER_UNAVAILABLE: 'provider_unavailable',
  INTERNAL_ERROR: 'internal_error',
} as const;

export type ContractErrorCode = typeof CONTRACT_ERROR_CODES[keyof typeof CONTRACT_ERROR_CODES];

export type ContractErrorPayload = {
  code: ContractErrorCode;
  message: string;
};

const PUBLIC_MESSAGES: Record<ContractErrorCode, string> = {
  [CONTRACT_ERROR_CODES.VALIDATION_ERROR]: 'request_invalid',
  [CONTRACT_ERROR_CODES.UNAUTHORIZED]: 'authentication_required',
  [CONTRACT_ERROR_CODES.FORBIDDEN]: 'operation_not_permitted',
  [CONTRACT_ERROR_CODES.NOT_FOUND]: 'resource_not_found',
  [CONTRACT_ERROR_CODES.CONFLICT]: 'request_conflict',
  [CONTRACT_ERROR_CODES.PAYMENT_REQUIRED]: 'payment_required',
  [CONTRACT_ERROR_CODES.PROVIDER_UNAVAILABLE]: 'provider_unavailable',
  [CONTRACT_ERROR_CODES.INTERNAL_ERROR]: 'request_failed',
};

export function publicContractMessage(code: ContractErrorCode): string {
  return PUBLIC_MESSAGES[code];
}
