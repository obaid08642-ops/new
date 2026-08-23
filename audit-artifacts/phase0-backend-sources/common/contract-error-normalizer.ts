import { HttpException, HttpStatus } from '@nestjs/common';
import { CONTRACT_ERROR_CODES, type ContractErrorCode } from './contract-errors';

const MESSAGE_TO_CODE: Record<string, ContractErrorCode> = {
  idempotency_key_required: CONTRACT_ERROR_CODES.VALIDATION_ERROR,
  invalid_idempotency_key: CONTRACT_ERROR_CODES.VALIDATION_ERROR,
  idempotency_key_reused_with_different_request: CONTRACT_ERROR_CODES.CONFLICT,
  idempotency_request_in_progress: CONTRACT_ERROR_CODES.CONFLICT,
  'Missing token': CONTRACT_ERROR_CODES.UNAUTHORIZED,
  'Invalid token': CONTRACT_ERROR_CODES.UNAUTHORIZED,
  provider_account_not_found: CONTRACT_ERROR_CODES.UNAUTHORIZED,
  provider_approval_required: CONTRACT_ERROR_CODES.FORBIDDEN,
  'Insufficient role': CONTRACT_ERROR_CODES.FORBIDDEN,
  'Insufficient permissions': CONTRACT_ERROR_CODES.FORBIDDEN,
  payment_required: CONTRACT_ERROR_CODES.PAYMENT_REQUIRED,
  provider_unavailable: CONTRACT_ERROR_CODES.PROVIDER_UNAVAILABLE,
};

function safeMessage(value: unknown): string {
  if (typeof value === 'string' && value.length <= 240) return value;
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string').join(', ').slice(0, 240);
  return 'request_failed';
}

export function normalizeContractError(exception: unknown) {
  const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
  const response = exception instanceof HttpException ? exception.getResponse() : undefined;
  const rawMessage = typeof response === 'string' ? response : (response as any)?.message;
  const message = safeMessage(rawMessage);
  const code = MESSAGE_TO_CODE[message] || (status === 400 ? CONTRACT_ERROR_CODES.VALIDATION_ERROR
    : status === 401 ? CONTRACT_ERROR_CODES.UNAUTHORIZED
      : status === 403 ? CONTRACT_ERROR_CODES.FORBIDDEN
        : status === 409 ? CONTRACT_ERROR_CODES.CONFLICT
          : status === 402 ? CONTRACT_ERROR_CODES.PAYMENT_REQUIRED
            : status >= 500 ? CONTRACT_ERROR_CODES.PROVIDER_UNAVAILABLE
              : CONTRACT_ERROR_CODES.VALIDATION_ERROR);
  return { status, payload: { code, message } };
}
