# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `server/_core/notification.ts`
- **Member SHA-256:** `550bf6544bf792b6d13c68539679deb363b70fbf07c0dbde189a98787f66f003`
- **Line count:** 114
- **Read range:** `1-114`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `1: import { TRPCError } from "@trpc/server";`
- `28: throw new TRPCError({`
- `34: throw new TRPCError({`
- `44: throw new TRPCError({`
- `51: throw new TRPCError({`
- `64: * bubble up as TRPC errors so callers can fix the payload.`
- `72: throw new TRPCError({`
- `79: throw new TRPCError({`
- `88: const response = await fetch(endpoint, {`
### auth_ownership
- `21: "webdevtoken.v1.WebDevService/SendNotification",`
- `61: * Dispatches a project-owner notification through the Manus Notification Service.`
- `66: export async function notifyOwner(`
- `92: authorization: `Bearer ${ENV.forgeApiKey}`,`
- `102: `[Notification] Failed to notify owner (${response.status} ${response.statusText})${`
### state_transitions
- `1: import { TRPCError } from "@trpc/server";`
- `13: const isNonEmptyString = (value: unknown): value is string =>`
- `27: if (!isNonEmptyString(input.title)) {`
- `28: throw new TRPCError({`
- `33: if (!isNonEmptyString(input.content)) {`
- `34: throw new TRPCError({`
- `44: throw new TRPCError({`
- `51: throw new TRPCError({`
- `63: * cannot be reached (callers can fall back to email/slack). Validation errors`
- `64: * bubble up as TRPC errors so callers can fix the payload.`
- `72: throw new TRPCError({`
- `73: code: "INTERNAL_SERVER_ERROR",`
### payment_insurance_relevance
- `4: export type NotificationPayload = {`
- `26: const validatePayload = (input: NotificationPayload): NotificationPayload => {`
- `64: * bubble up as TRPC errors so callers can fix the payload.`
- `67: payload: NotificationPayload`
- `69: const { title, content } = validatePayload(payload);`
### error_empty_loading_retry_cancel
- `1: import { TRPCError } from "@trpc/server";`
- `13: const isNonEmptyString = (value: unknown): value is string =>`
- `27: if (!isNonEmptyString(input.title)) {`
- `28: throw new TRPCError({`
- `33: if (!isNonEmptyString(input.content)) {`
- `34: throw new TRPCError({`
- `44: throw new TRPCError({`
- `51: throw new TRPCError({`
- `63: * cannot be reached (callers can fall back to email/slack). Validation errors`
- `64: * bubble up as TRPC errors so callers can fix the payload.`
- `72: throw new TRPCError({`
- `73: code: "INTERNAL_SERVER_ERROR",`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
