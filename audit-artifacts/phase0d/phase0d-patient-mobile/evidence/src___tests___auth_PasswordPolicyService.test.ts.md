# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/__tests__/auth/PasswordPolicyService.test.ts`
- **Member SHA-256:** `c6f91e8bd10244cf0b1a6264dac7e87a5746f40249458f67ae3d2b766aa3dc04`
- **Line count:** 26
- **Read range:** `1-26`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `1: import { PasswordPolicyService } from '../../../src/core/platform/auth/PasswordPolicyService';`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import { ValidationError } from '../../../src/core/domain/errors';`
- `16: expect(() => policy.validate('Sh1!')).toThrow(ValidationError);`
- `20: expect(() => policy.validate('StrongPass!')).toThrow(ValidationError);`
- `24: expect(() => policy.validate('StrongPass12')).toThrow(ValidationError);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `2: import { ValidationError } from '../../../src/core/domain/errors';`
- `16: expect(() => policy.validate('Sh1!')).toThrow(ValidationError);`
- `20: expect(() => policy.validate('StrongPass!')).toThrow(ValidationError);`
- `24: expect(() => policy.validate('StrongPass12')).toThrow(ValidationError);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
