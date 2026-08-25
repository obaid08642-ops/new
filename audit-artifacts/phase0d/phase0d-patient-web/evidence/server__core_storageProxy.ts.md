# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `server/_core/storageProxy.ts`
- **Member SHA-256:** `dec37a868cf4d82d4cadf18ba279e3aa60ff863c9026ecd2a2165650d2d968e0`
- **Line count:** 48
- **Read range:** `1-48`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: export function registerStorageProxy(app: Express) {`
### backend_consumers_or_contracts
- `24: const forgeResp = await fetch(forgeUrl, {`
### auth_ownership
- `25: headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },`
### state_transitions
- `8: res.status(400).send("Missing storage key");`
- `13: res.status(500).send("Storage proxy not configured");`
- `30: console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);`
- `31: res.status(502).send("Storage backend error");`
- `37: res.status(502).send("Empty signed URL from backend");`
- `44: console.error("[StorageProxy] failed:", err);`
- `45: res.status(502).send("Storage proxy error");`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `29: const body = await forgeResp.text().catch(() => "");`
- `30: console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);`
- `31: res.status(502).send("Storage backend error");`
- `37: res.status(502).send("Empty signed URL from backend");`
- `43: } catch (err) {`
- `44: console.error("[StorageProxy] failed:", err);`
- `45: res.status(502).send("Storage proxy error");`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
