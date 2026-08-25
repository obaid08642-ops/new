# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/main.tsx`
- **Member SHA-256:** `0e322fd292220e189d5acc65a89e65fee16d29a5c261625ce758cde3bfd72fd2`
- **Line count:** 81
- **Read range:** `1-81`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { startLogin } from "./const";`
- `13: const redirectToLoginIfUnauthorized = (error: unknown) => {`
- `21: startLogin();`
- `27: redirectToLoginIfUnauthorized(error);`
- `35: redirectToLoginIfUnauthorized(error);`
- `46: // Preview auto-login fallback: when the browser blocks iframe cookies`
### backend_consumers_or_contracts
- `1: import { trpc } from "@/lib/trpc";`
- `4: import { httpBatchLink, TRPCClientError } from "@trpc/client";`
- `14: if (!(error instanceof TRPCClientError)) return;`
- `24: queryClient.getQueryCache().subscribe(event => {`
- `32: queryClient.getMutationCache().subscribe(event => {`
- `40: const trpcClient = trpc.createClient({`
- `43: url: "/api/trpc",`
- `65: fetch(input, init) {`
- `66: return globalThis.fetch(input, {`
- `76: <trpc.Provider client={trpcClient} queryClient={queryClient}>`
- `80: </trpc.Provider>`
### auth_ownership
- `2: import { COOKIE_NAME, UNAUTHED_ERR_MSG } from '@shared/const';`
- `8: import { startLogin } from "./const";`
- `13: const redirectToLoginIfUnauthorized = (error: unknown) => {`
- `21: startLogin();`
- `27: redirectToLoginIfUnauthorized(error);`
- `35: redirectToLoginIfUnauthorized(error);`
- `46: // Preview auto-login fallback: when the browser blocks iframe cookies`
- `48: // session into sessionStorage so we can forward it as a Bearer token.`
- `49: // The regular OAuth cookie flow keeps working and takes priority server-side.`
- `51: const raw = sessionStorage.getItem("manus-cookie");`
- `53: const prefix = `${COOKIE_NAME}=`;`
- `55: const token = pair?.trim().slice(prefix.length);`
### state_transitions
- `4: import { httpBatchLink, TRPCClientError } from "@trpc/client";`
- `13: const redirectToLoginIfUnauthorized = (error: unknown) => {`
- `14: if (!(error instanceof TRPCClientError)) return;`
- `17: const isUnauthorized = error.message === UNAUTHED_ERR_MSG;`
- `25: if (event.type === "updated" && event.action.type === "error") {`
- `26: const error = event.query.state.error;`
- `27: redirectToLoginIfUnauthorized(error);`
- `28: console.error("[API Query Error]", error);`
- `33: if (event.type === "updated" && event.action.type === "error") {`
- `34: const error = event.mutation.state.error;`
- `35: redirectToLoginIfUnauthorized(error);`
- `36: console.error("[API Mutation Error]", error);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `4: import { httpBatchLink, TRPCClientError } from "@trpc/client";`
- `13: const redirectToLoginIfUnauthorized = (error: unknown) => {`
- `14: if (!(error instanceof TRPCClientError)) return;`
- `17: const isUnauthorized = error.message === UNAUTHED_ERR_MSG;`
- `25: if (event.type === "updated" && event.action.type === "error") {`
- `26: const error = event.query.state.error;`
- `27: redirectToLoginIfUnauthorized(error);`
- `28: console.error("[API Query Error]", error);`
- `33: if (event.type === "updated" && event.action.type === "error") {`
- `34: const error = event.mutation.state.error;`
- `35: redirectToLoginIfUnauthorized(error);`
- `36: console.error("[API Mutation Error]", error);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
