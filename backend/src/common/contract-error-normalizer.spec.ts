import { BadRequestException, HttpException, HttpStatus, InternalServerErrorException } from '@nestjs/common';
import { CONTRACT_ERROR_CODES } from './contract-errors';
import { normalizeContractError } from './contract-error-normalizer';

describe('normalizeContractError', () => {
  it('maps only allowlisted public messages and does not echo raw input', () => {
    const result = normalizeContractError(new BadRequestException('password=super-secret-token'));
    expect(result.status).toBe(HttpStatus.BAD_REQUEST);
    expect(result.payload).toEqual({ code: CONTRACT_ERROR_CODES.VALIDATION_ERROR, message: 'request_invalid' });
    expect(result.payload.message).not.toContain('super-secret-token');
    expect(result.internalMessage).toContain('super-secret-token');
  });

  it('preserves an explicit provider-unavailable contract code only', () => {
    const result = normalizeContractError(new HttpException('provider_unavailable', HttpStatus.SERVICE_UNAVAILABLE));
    expect(result.payload).toEqual({ code: CONTRACT_ERROR_CODES.PROVIDER_UNAVAILABLE, message: 'provider_unavailable' });
  });

  it('classifies generic five-hundred errors as internal without leaking their message', () => {
    const result = normalizeContractError(new InternalServerErrorException('Mongo connection failed: mongodb://secret-host'));
    expect(result.payload).toEqual({ code: CONTRACT_ERROR_CODES.INTERNAL_ERROR, message: 'request_failed' });
    expect(result.payload.message).not.toContain('secret-host');
  });

  it('maps idempotency conflicts to a public conflict response', () => {
    const result = normalizeContractError(new HttpException('idempotency_request_in_progress', HttpStatus.CONFLICT));
    expect(result.payload).toEqual({ code: CONTRACT_ERROR_CODES.CONFLICT, message: 'request_conflict' });
  });
});
