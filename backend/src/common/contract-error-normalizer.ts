import { HttpException, HttpStatus } from '@nestjs/common';
import { CONTRACT_ERROR_CODES, publicContractMessage, type ContractErrorCode, type ContractErrorPayload } from './contract-errors';

const MESSAGE_TO_CODE: Record<string, ContractErrorCode> = {
  idempotency_key_required: CONTRACT_ERROR_CODES.VALIDATION_ERROR,
  idempotency_key_reused_with_different_request: CONTRACT_ERROR_CODES.CONFLICT,
  idempotency_request_in_progress: CONTRACT_ERROR_CODES.CONFLICT,
  payment_required: CONTRACT_ERROR_CODES.PAYMENT_REQUIRED,
  provider_unavailable: CONTRACT_ERROR_CODES.PROVIDER_UNAVAILABLE,
};

function responseMessage(response: unknown): string | undefined {
  if (typeof response === 'string') return response;
  if (typeof response !== 'object' || response === null) return undefined;
  const candidate = (response as { message?: unknown }).message;
  if (typeof candidate === 'string') return candidate;
  if (Array.isArray(candidate)) return candidate.find((item): item is string => typeof item === 'string');
  return undefined;
}

function codeForStatus(status: number, rawMessage?: string): ContractErrorCode {
  if (rawMessage && MESSAGE_TO_CODE[rawMessage]) return MESSAGE_TO_CODE[rawMessage];
  if (status === HttpStatus.BAD_REQUEST || status === HttpStatus.UNPROCESSABLE_ENTITY) return CONTRACT_ERROR_CODES.VALIDATION_ERROR;
  if (status === HttpStatus.UNAUTHORIZED) return CONTRACT_ERROR_CODES.UNAUTHORIZED;
  if (status === HttpStatus.FORBIDDEN) return CONTRACT_ERROR_CODES.FORBIDDEN;
  if (status === HttpStatus.NOT_FOUND) return CONTRACT_ERROR_CODES.NOT_FOUND;
  if (status === HttpStatus.CONFLICT) return CONTRACT_ERROR_CODES.CONFLICT;
  if (status === HttpStatus.PAYMENT_REQUIRED) return CONTRACT_ERROR_CODES.PAYMENT_REQUIRED;
  return CONTRACT_ERROR_CODES.INTERNAL_ERROR;
}

export type NormalizedContractError = {
  status: number;
  payload: ContractErrorPayload;
  internalMessage?: string;
};

export function normalizeContractError(exception: unknown): NormalizedContractError {
  const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
  const rawMessage = exception instanceof HttpException ? responseMessage(exception.getResponse()) : undefined;
  const code = codeForStatus(status, rawMessage);
  return {
    status,
    payload: { code, message: publicContractMessage(code) },
    internalMessage: rawMessage?.slice(0, 500),
  };
}
