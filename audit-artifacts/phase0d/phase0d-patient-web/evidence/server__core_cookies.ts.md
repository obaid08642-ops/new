# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `server/_core/cookies.ts`
- **Member SHA-256:** `8b9f416d2d3ea74b3c26cb6855d9019ad7cc4403e103a150502179874c568373`
- **Line count:** 48
- **Read range:** `1-48`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: import type { CookieOptions, Request } from "express";`
- `24: export function getSessionCookieOptions(`
- `26: ): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
