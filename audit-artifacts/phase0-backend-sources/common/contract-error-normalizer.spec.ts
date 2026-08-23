import { BadRequestException, ConflictException, ForbiddenException, HttpException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { normalizeContractError } from './contract-error-normalizer';

describe('normalizeContractError', () => {
  it.each([
    [new BadRequestException('invalid_idempotency_key'), 'VALIDATION_ERROR', 400],
    [new UnauthorizedException('Missing token'), 'UNAUTHORIZED', 401],
    [new ForbiddenException('Insufficient permissions'), 'FORBIDDEN', 403],
    [new ConflictException('idempotency_request_in_progress'), 'CONFLICT', 409],
    [new HttpException('payment_required', 402), 'PAYMENT_REQUIRED', 402],
    [new InternalServerErrorException('private stack details'), 'PROVIDER_UNAVAILABLE', 500],
  ] as const)('normalizes known exception (%s)', (exception, code, status) => {
    expect(normalizeContractError(exception)).toEqual({ status, payload: { code, message: expect.any(String) } });
    expect(normalizeContractError(exception).payload.code).toBe(code);
  });

  it('does not emit oversized or non-string details', () => {
    const result = normalizeContractError(new HttpException({ message: { secret: 'do-not-expose' } }, 400));
    expect(result.payload.message).toBe('request_failed');
    expect(JSON.stringify(result)).not.toContain('do-not-expose');
  });
});
