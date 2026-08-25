# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `server/_core/trpc.ts`
- **Member SHA-256:** `95679492e0478938f9bab6e3388ba6a95d3ab3329e6ff2eb9686e638cd07d98e`
- **Line count:** 45
- **Read range:** `1-45`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: export const router = t.router;`
### backend_consumers_or_contracts
- `2: import { initTRPC, TRPCError } from "@trpc/server";`
- `4: import type { TrpcContext } from "./context";`
- `6: const t = initTRPC.context<TrpcContext>().create({`
- `17: throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });`
- `35: throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });`
### auth_ownership
- `1: import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';`
- `30: export const adminProcedure = t.procedure.use(`
- `34: if (!ctx.user || ctx.user.role !== 'admin') {`
- `35: throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });`
### state_transitions
- `2: import { initTRPC, TRPCError } from "@trpc/server";`
- `17: throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });`
- `35: throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `2: import { initTRPC, TRPCError } from "@trpc/server";`
- `17: throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });`
- `35: throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
