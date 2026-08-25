# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `server/_core/index.ts`
- **Member SHA-256:** `f3af20b0d575c078de9a9af88194131084e2b315c51698f3e79002019fbc2035`
- **Line count:** 66
- **Read range:** `1-66`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: import { registerOAuthRoutes } from "./oauth";`
- `7: import { registerStorageProxy } from "./storageProxy";`
- `8: import { appRouter } from "../routers";`
- `34: // Configure body parser with larger size limit for file uploads`
- `37: registerStorageProxy(app);`
- `38: registerOAuthRoutes(app);`
- `43: router: appRouter,`
### backend_consumers_or_contracts
- `5: import { createExpressMiddleware } from "@trpc/server/adapters/express";`
- `39: // tRPC API`
- `41: "/api/trpc",`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `18: server.on("error", () => resolve(false));`
- `28: throw new Error(`No available port found starting from ${startPort}`);`
- `66: startServer().catch(console.error);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `18: server.on("error", () => resolve(false));`
- `28: throw new Error(`No available port found starting from ${startPort}`);`
- `66: startServer().catch(console.error);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
