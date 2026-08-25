# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/platform/auth/PasswordPolicyService.ts`
- **Member SHA-256:** `ee70f5be4ea4302690118e1343a4397bd31beb88f6abaf1ff1777cab9011905a`
- **Line count:** 61
- **Read range:** `1-61`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import { ValidationError } from '../../domain/errors';`
- `27: * Throws ValidationError if rules are violated.`
- `31: throw new ValidationError(`Password must be at least ${this.config.minLength} characters`);`
- `35: throw new ValidationError('Password must contain at least one uppercase letter');`
- `39: throw new ValidationError('Password must contain at least one lowercase letter');`
- `43: throw new ValidationError('Password must contain at least one number');`
- `47: throw new ValidationError('Password must contain at least one special character');`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `2: import { ValidationError } from '../../domain/errors';`
- `27: * Throws ValidationError if rules are violated.`
- `31: throw new ValidationError(`Password must be at least ${this.config.minLength} characters`);`
- `35: throw new ValidationError('Password must contain at least one uppercase letter');`
- `39: throw new ValidationError('Password must contain at least one lowercase letter');`
- `43: throw new ValidationError('Password must contain at least one number');`
- `47: throw new ValidationError('Password must contain at least one special character');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
