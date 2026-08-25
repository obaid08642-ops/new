# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/upstream.ts`
- **Member SHA-256:** `d0eb1da677b41af8d1a1edce71aea1cb312a2bc95ef58cb037e5fd2cf7a01f7f`
- **Line count:** 13
- **Read range:** `1-13`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `1: const API_BASE_URL = (process.env.NABD_API_BASE_URL || "https://api.nabd.plus/api/v1").replace(/\/$/, "");`
- `9: return await fetch(patientApiUrl(path), { ...init, headers, cache: "no-store" });`
### auth_ownership
- `3: export async function callPatientApi(path: string, init: RequestInit = {}, accessToken?: string | null) {`
- `6: if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);`
### state_transitions
- `2: export function patientApiUrl(path: string) { if (!path.startsWith("/") || path.includes("..")) throw new Error("invalid_patient_api_path"); return `${API_BASE_URL}${path}`; }`
- `11: return new Response(null, { status: 503, statusText: "upstream_unavailable" });`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `2: export function patientApiUrl(path: string) { if (!path.startsWith("/") || path.includes("..")) throw new Error("invalid_patient_api_path"); return `${API_BASE_URL}${path}`; }`
- `10: } catch {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
