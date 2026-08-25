# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/domain/Result.ts`
- **Member SHA-256:** `fab6229935207f01e48a8df57ea5c8de9dd73a189c0c71b47a37cad212939e58`
- **Line count:** 44
- **Read range:** `1-44`
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
- `1: import { ErrorType, BaseError } from './errors';`
- `4: public isSuccess: boolean;`
- `6: public error?: BaseError;`
- `9: private constructor(isSuccess: boolean, error?: BaseError, value?: T) {`
- `10: if (isSuccess && error) {`
- `11: throw new Error('InvalidOperation: A result cannot be successful and contain an error');`
- `13: if (!isSuccess && !error) {`
- `14: throw new Error('InvalidOperation: A failing result needs to contain an error message');`
- `17: this.isSuccess = isSuccess;`
- `18: this.isFailure = !isSuccess;`
- `19: this.error = error;`
- `24: if (!this.isSuccess) {`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `1: import { ErrorType, BaseError } from './errors';`
- `6: public error?: BaseError;`
- `9: private constructor(isSuccess: boolean, error?: BaseError, value?: T) {`
- `10: if (isSuccess && error) {`
- `11: throw new Error('InvalidOperation: A result cannot be successful and contain an error');`
- `13: if (!isSuccess && !error) {`
- `14: throw new Error('InvalidOperation: A failing result needs to contain an error message');`
- `19: this.error = error;`
- `25: throw new Error('Can not get the value of an error result. Use .error instead');`
- `34: public static fail<U>(error: BaseError): Result<U> {`
- `35: return new Result<U>(false, error);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
