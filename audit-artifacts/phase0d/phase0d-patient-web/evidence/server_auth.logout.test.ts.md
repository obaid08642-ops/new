# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `server/auth.logout.test.ts`
- **Member SHA-256:** `253f4a050743093300aa70fc0072f5fbd46cfba96ecfd1d52d434fbe7dcfb54a`
- **Line count:** 62
- **Read range:** `1-62`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: import { appRouter } from "./routers";`
- `21: loginMethod: "manus",`
- `44: describe("auth.logout", () => {`
- `47: const caller = appRouter.createCaller(ctx);`
- `49: const result = await caller.auth.logout();`
### backend_consumers_or_contracts
- `4: import type { TrpcContext } from "./_core/context";`
- `11: type AuthenticatedUser = NonNullable<TrpcContext["user"]>;`
- `13: function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {`
- `28: const ctx: TrpcContext = {`
- `33: } as TrpcContext["req"],`
- `38: } as TrpcContext["res"],`
### auth_ownership
- `3: import { COOKIE_NAME } from "../shared/const";`
- `6: type CookieCall = {`
- `13: function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {`
- `14: const clearedCookies: CookieCall[] = [];`
- `21: loginMethod: "manus",`
- `22: role: "user",`
- `35: clearCookie: (name: string, options: Record<string, unknown>) => {`
- `36: clearedCookies.push({ name, options });`
- `41: return { ctx, clearedCookies };`
- `44: describe("auth.logout", () => {`
- `45: it("clears the session cookie and reports success", async () => {`
- `46: const { ctx, clearedCookies } = createAuthContext();`
### state_transitions
- `45: it("clears the session cookie and reports success", async () => {`
- `51: expect(result).toEqual({ success: true });`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
