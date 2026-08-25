# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `server/_core/systemRouter.ts`
- **Member SHA-256:** `61bb2c904da1fa08a425f8882aa3b23003bba7266ce00b2d9fcd685e5d4bffaf`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { adminProcedure, publicProcedure, router } from "./trpc";`
- `5: export const systemRouter = router({`
### backend_consumers_or_contracts
- `3: import { adminProcedure, publicProcedure, router } from "./trpc";`
### auth_ownership
- `2: import { notifyOwner } from "./notification";`
- `3: import { adminProcedure, publicProcedure, router } from "./trpc";`
- `16: notifyOwner: adminProcedure`
- `24: const delivered = await notifyOwner(input);`
### state_transitions
- `24: const delivered = await notifyOwner(input);`
- `26: success: delivered,`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
