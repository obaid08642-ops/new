# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/home-care-services.ts`
- **Member SHA-256:** `e930203816788db7eab4aca680a343e618ba976b73b839e1d8c826a15f2245f2`
- **Line count:** 57
- **Read range:** `1-57`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `43: if (!parsed.success) return null;`
### payment_insurance_relevance
- `13: price: z.number().nonnegative().optional(),`
- `16: insurance_availability: z.boolean().optional(),`
- `26: price?: number;`
- `29: insuranceAvailable?: boolean;`
- `32: function rowsFrom(payload: unknown): unknown[] {`
- `33: if (Array.isArray(payload)) return payload;`
- `34: if (payload && typeof payload === "object" && !Array.isArray(payload)) {`
- `35: const root = payload as Record<string, unknown>;`
- `48: return { id: item.id, slug: item.slug, nameAr, nameEn, descriptionAr: item.description_ar ?? item.description, descriptionEn: item.description_en ?? item.description, price: item.price, durationValue: item.duration_value, duration: item.dur`
- `52: export function extractHomeCareServices(payload: unknown) { return rowsFrom(payload).flatMap((value) => { const service = parseService(value); return service ? [service] : []; }); }`
- `53: export function extractHomeCareService(payload: unknown) {`
- `54: const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : payload;`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
