# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/lib/trpc.ts`
- **Member SHA-256:** `d883ad43f46eaf73342924feaf5342ce601d04abe1a828076625071931cc0ef3`
- **Line count:** 4
- **Read range:** `1-4`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: import type { AppRouter } from "../../../server/routers";`
- `4: export const trpc = createTRPCReact<AppRouter>();`
### backend_consumers_or_contracts
- `1: import { createTRPCReact } from "@trpc/react-query";`
- `4: export const trpc = createTRPCReact<AppRouter>();`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
