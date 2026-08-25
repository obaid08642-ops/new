# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `server/_core/heartbeat.ts`
- **Member SHA-256:** `e9070208f34813a427d4a79207819acc2ac0d1de5244b4db55fe3a94bfe3f950`
- **Line count:** 213
- **Read range:** `1-213`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `203: pagination?: { page?: number; pageSize?: number }`
- `206: if (pagination?.page !== undefined) body.page = pagination.page;`
- `207: if (pagination?.pageSize !== undefined) body.pageSize = pagination.pageSize;`
### backend_consumers_or_contracts
- `1: import { TRPCError } from "@trpc/server";`
- `12: /** Callback path. MUST start with `/api/scheduled/`. */`
- `47: throw new TRPCError({`
- `53: throw new TRPCError({`
- `83: response = await fetch(endpoint, {`
- `89: throw new TRPCError({`
- `106: ): TRPCError => {`
- `108: let code: TRPCError["code"] = "INTERNAL_SERVER_ERROR";`
- `115: return new TRPCError({`
- `128: if (!path || !path.startsWith("/api/scheduled/")) {`
- `129: throw new TRPCError({`
- `131: message: "callback path must start with /api/scheduled/",`
### auth_ownership
- `22: * `name` is the (project, owner)-scope key and cannot be changed.`
- `43: const SERVICE = "webdevtoken.v1.WebDevService";`
- `66: userSession: string`
- `71: authorization: `Bearer ${ENV.forgeApiKey}`,`
- `75: // userSession is the decoded `app_session_id` cookie value (NOT the raw`
- `76: // Cookie header). Empty string falls back to the project owner identity.`
- `77: if (userSession) {`
- `78: headers["x-manus-user-session"] = userSession;`
- `142: userSession: string`
- `155: userSession`
- `166: userSession: string`
- `181: userSession`
### state_transitions
- `1: import { TRPCError } from "@trpc/server";`
- `47: throw new TRPCError({`
- `48: code: "INTERNAL_SERVER_ERROR",`
- `53: throw new TRPCError({`
- `54: code: "INTERNAL_SERVER_ERROR",`
- `76: // Cookie header). Empty string falls back to the project owner identity.`
- `88: } catch (error) {`
- `89: throw new TRPCError({`
- `90: code: "INTERNAL_SERVER_ERROR",`
- `91: message: `Heartbeat ${rpc} network error: ${String(error)}`,`
- `97: throw mapForgeError(response, detail, rpc);`
- `102: const mapForgeError = (`
### payment_insurance_relevance
- `15: payload?: unknown;`
- `36: callbackPayload: string;`
- `121: const stringifyPayload = (payload: unknown): string => {`
- `122: if (payload === undefined || payload === null) return "{}";`
- `123: if (typeof payload === "string") return payload;`
- `124: return JSON.stringify(payload);`
- `152: callbackPayload: stringifyPayload(job.payload),`
- `173: if (patch.payload !== undefined) {`
- `174: body.callbackPayload = stringifyPayload(patch.payload);`
- `204: ): Promise<{ total: number; actorUserId: string; jobs: HeartbeatJobInfo[] }> {`
- `209: total: number;`
### error_empty_loading_retry_cancel
- `1: import { TRPCError } from "@trpc/server";`
- `47: throw new TRPCError({`
- `48: code: "INTERNAL_SERVER_ERROR",`
- `53: throw new TRPCError({`
- `54: code: "INTERNAL_SERVER_ERROR",`
- `76: // Cookie header). Empty string falls back to the project owner identity.`
- `88: } catch (error) {`
- `89: throw new TRPCError({`
- `90: code: "INTERNAL_SERVER_ERROR",`
- `91: message: `Heartbeat ${rpc} network error: ${String(error)}`,`
- `96: const detail = await response.text().catch(() => "");`
- `97: throw mapForgeError(response, detail, rpc);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
