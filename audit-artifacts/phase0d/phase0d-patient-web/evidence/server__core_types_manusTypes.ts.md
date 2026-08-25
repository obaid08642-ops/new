# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `server/_core/types/manusTypes.ts`
- **Member SHA-256:** `d073995b792a4376177bf7270cbcf3a670d4e72efb8eb6a83ecb55043cc729c3`
- **Line count:** 71
- **Read range:** `1-71`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `45: loginMethod?: string | null;`
- `68: loginMethod?: string | null;`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `17: export interface ExchangeTokenRequest {`
- `20: refreshToken?: string;`
- `26: export interface ExchangeTokenResponse {`
- `27: accessToken: string;`
- `28: tokenType: string;`
- `30: refreshToken?: string;`
- `32: idToken: string;`
- `36: accessToken: string;`
- `45: loginMethod?: string | null;`
- `58: jwtToken: string;`
- `68: loginMethod?: string | null;`
### state_transitions
- `8: state: string;`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
