# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/auth/session.ts`
- **Member SHA-256:** `dc31f542f08afcfd02502b42dcbef94cc546d59438cef3fe1bcbc30bf602baf2`
- **Line count:** 9
- **Read range:** `1-9`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: if (!accessToken) redirect(`/${locale}/login`);`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: import { cookies } from "next/headers";`
- `3: import { authCookieNames } from "./cookies";`
- `6: const accessToken = (await cookies()).get(authCookieNames.access)?.value;`
- `7: if (!accessToken) redirect(`/${locale}/login`);`
- `8: return accessToken;`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
