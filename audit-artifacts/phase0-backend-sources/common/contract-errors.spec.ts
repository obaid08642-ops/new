import { CONTRACT_ERROR_CODES, contractError } from './contract-errors';

describe('contract error catalog', () => {
  it('contains the shared contract error codes required by the remediation plan', () => {
    expect(CONTRACT_ERROR_CODES).toEqual({
      VALIDATION_ERROR: 'VALIDATION_ERROR',
      UNAUTHORIZED: 'UNAUTHORIZED',
      FORBIDDEN: 'FORBIDDEN',
      CONFLICT: 'CONFLICT',
      IDEMPOTENCY_REPLAY: 'IDEMPOTENCY_REPLAY',
      PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
      PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
    });
  });

  it('does not add an empty details object to an error payload', () => {
    expect(contractError(CONTRACT_ERROR_CODES.CONFLICT, 'operation_conflict')).toEqual({
      code: 'CONFLICT',
      message: 'operation_conflict',
    });
    expect(contractError(CONTRACT_ERROR_CODES.VALIDATION_ERROR, 'invalid_input', { field: 'email' })).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'invalid_input',
      details: { field: 'email' },
    });
  });
});
