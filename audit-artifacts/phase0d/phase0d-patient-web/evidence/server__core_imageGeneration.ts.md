# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `server/_core/imageGeneration.ts`
- **Member SHA-256:** `3218b6a0a642d92fc5cb24f8737147b8e4f3f11474e53576b6ed4679d7973ccb`
- **Line count:** 160
- **Read range:** `1-160`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `66: const response = await fetch(fullUrl, {`
- `140: const response = await fetch(fullUrl, {`
### auth_ownership
- `72: authorization: `Bearer ${ENV.forgeApiKey}`,`
- `146: authorization: `Bearer ${ENV.forgeApiKey}`,`
### state_transitions
- `47: throw new Error("BUILT_IN_FORGE_API_URL is not configured");`
- `50: throw new Error("BUILT_IN_FORGE_API_KEY is not configured");`
- `53: // Build the full URL by appending the service path to the base URL`
- `84: throw new Error(`
- `85: `Image generation request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}``
- `126: throw new Error("BUILT_IN_FORGE_API_URL is not configured");`
- `129: throw new Error("BUILT_IN_FORGE_API_KEY is not configured");`
- `153: throw new Error(`
- `154: `List image models failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}``
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `47: throw new Error("BUILT_IN_FORGE_API_URL is not configured");`
- `50: throw new Error("BUILT_IN_FORGE_API_KEY is not configured");`
- `53: // Build the full URL by appending the service path to the base URL`
- `83: const detail = await response.text().catch(() => "");`
- `84: throw new Error(`
- `85: `Image generation request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}``
- `126: throw new Error("BUILT_IN_FORGE_API_URL is not configured");`
- `129: throw new Error("BUILT_IN_FORGE_API_KEY is not configured");`
- `152: const detail = await response.text().catch(() => "");`
- `153: throw new Error(`
- `154: `List image models failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}``

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
