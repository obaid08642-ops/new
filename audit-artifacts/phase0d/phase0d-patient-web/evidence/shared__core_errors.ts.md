# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `shared/_core/errors.ts`
- **Member SHA-256:** `52bee7d152045eaa009083e26a4cbc21d413c80b0403a23c4b5572141dec942a`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: * Throw this from route handlers to send specific HTTP errors.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: * Base HTTP error class with status code.`
- `3: * Throw this from route handlers to send specific HTTP errors.`
- `5: export class HttpError extends Error {`
- `7: public statusCode: number,`
- `11: this.name = "HttpError";`
- `16: export const BadRequestError = (msg: string) => new HttpError(400, msg);`
- `17: export const UnauthorizedError = (msg: string) => new HttpError(401, msg);`
- `18: export const ForbiddenError = (msg: string) => new HttpError(403, msg);`
- `19: export const NotFoundError = (msg: string) => new HttpError(404, msg);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `2: * Base HTTP error class with status code.`
- `3: * Throw this from route handlers to send specific HTTP errors.`
- `5: export class HttpError extends Error {`
- `11: this.name = "HttpError";`
- `16: export const BadRequestError = (msg: string) => new HttpError(400, msg);`
- `17: export const UnauthorizedError = (msg: string) => new HttpError(401, msg);`
- `18: export const ForbiddenError = (msg: string) => new HttpError(403, msg);`
- `19: export const NotFoundError = (msg: string) => new HttpError(404, msg);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
