# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `scripts/verify-sandbox-medicine-fields.mjs`
- **Member SHA-256:** `95a8a2f1e26a7931c93d1115dfbfc913c14f5e60d5fa51a47f9bbf5c5c1185b5`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `16: const response = await fetch(`${baseUrl}/medicines?limit=1`, { signal: AbortSignal.timeout(12_000) });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: if (!baseUrl) throw new Error("Medicine catalog verification requires NABD_API_BASE_URL");`
- `17: if (!response.ok) throw new Error(`Medicine catalog returned ${response.status}`);`
- `20: console.log(`medicine catalog: ${keys.length} field name(s); ${keys.length ? `keys=${keys.join(",")}` : "empty result"}`);`
### payment_insurance_relevance
- `8: function firstItem(payload) {`
- `9: if (Array.isArray(payload)) return payload[0];`
- `10: const root = asRecord(payload);`
### error_empty_loading_retry_cancel
- `2: if (!baseUrl) throw new Error("Medicine catalog verification requires NABD_API_BASE_URL");`
- `16: const response = await fetch(`${baseUrl}/medicines?limit=1`, { signal: AbortSignal.timeout(12_000) });`
- `17: if (!response.ok) throw new Error(`Medicine catalog returned ${response.status}`);`
- `20: console.log(`medicine catalog: ${keys.length} field name(s); ${keys.length ? `keys=${keys.join(",")}` : "empty result"}`);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
