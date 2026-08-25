# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `server/routers.ts`
- **Member SHA-256:** `9ba9b6c1b21ae6854e2c32c95e3718a0e7cfe472220382932bf9194adb5d7fc2`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { systemRouter } from "./_core/systemRouter";`
- `4: import { publicProcedure, router } from "./_core/trpc";`
- `6: export const appRouter = router({`
- `7: // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly`
- `8: system: systemRouter,`
- `9: auth: router({`
- `11: logout: publicProcedure.mutation(({ ctx }) => {`
- `20: // TODO: add feature routers here, e.g.`
- `21: // todo: router({`
- `28: export type AppRouter = typeof appRouter;`
### backend_consumers_or_contracts
- `4: import { publicProcedure, router } from "./_core/trpc";`
- `7: // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly`
### auth_ownership
- `1: import { COOKIE_NAME } from "@shared/const";`
- `2: import { getSessionCookieOptions } from "./_core/cookies";`
- `11: logout: publicProcedure.mutation(({ ctx }) => {`
- `12: const cookieOptions = getSessionCookieOptions(ctx.req);`
- `13: ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });`
### state_transitions
- `15: success: true,`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
