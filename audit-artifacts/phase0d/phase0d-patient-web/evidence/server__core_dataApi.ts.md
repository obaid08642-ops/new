# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `server/_core/dataApi.ts`
- **Member SHA-256:** `194ef8e309abde283a1132aa383af10ae583e27e983afa30dfcece3aa9ce27a7`
- **Line count:** 64
- **Read range:** `1-64`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `31: const response = await fetch(fullUrl, {`
### auth_ownership
- `29: const fullUrl = new URL("webdevtoken.v1.WebDevService/CallApi", baseUrl).toString();`
- `37: authorization: `Bearer ${ENV.forgeApiKey}`,`
### state_transitions
- `21: throw new Error("BUILT_IN_FORGE_API_URL is not configured");`
- `24: throw new Error("BUILT_IN_FORGE_API_KEY is not configured");`
- `27: // Build the full URL by appending the service path to the base URL`
- `50: throw new Error(`
- `51: `Data API request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}``
### payment_insurance_relevance
- `55: const payload = await response.json().catch(() => ({}));`
- `56: if (payload && typeof payload === "object" && "jsonData" in payload) {`
- `58: return JSON.parse((payload as Record<string, string>).jsonData ?? "{}");`
- `60: return (payload as Record<string, unknown>).jsonData;`
- `63: return payload;`
### error_empty_loading_retry_cancel
- `21: throw new Error("BUILT_IN_FORGE_API_URL is not configured");`
- `24: throw new Error("BUILT_IN_FORGE_API_KEY is not configured");`
- `27: // Build the full URL by appending the service path to the base URL`
- `49: const detail = await response.text().catch(() => "");`
- `50: throw new Error(`
- `51: `Data API request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}``
- `55: const payload = await response.json().catch(() => ({}));`
- `59: } catch {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
