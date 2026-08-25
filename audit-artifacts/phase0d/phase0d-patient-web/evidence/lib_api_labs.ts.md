# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/labs.ts`
- **Member SHA-256:** `b9f41ce3fb703623ba481d0c14a42119f5269780ae39ce0ed44681203dadc96f`
- **Line count:** 78
- **Read range:** `1-78`
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
- `55: if (!parsed.success) return null;`
### payment_insurance_relevance
- `13: price: z.number().nonnegative().optional(),`
- `14: old_price: z.number().nonnegative().optional(),`
- `25: insurance_availability: z.boolean().optional(),`
- `37: price?: number; oldPrice?: number; fastingRequired?: boolean; fastingHours?: number;`
- `39: preparationAr?: string[]; preparationEn?: string[]; isPackage?: boolean; includedServices?: string[]; specialNotes?: string; insuranceAvailable?: boolean;`
- `44: function rowsFrom(payload: unknown): unknown[] {`
- `45: if (Array.isArray(payload)) return payload;`
- `46: if (payload && typeof payload === "object" && !Array.isArray(payload)) {`
- `47: const root = payload as Record<string, unknown>;`
- `61: sampleType: item.sample_type, price: item.price, oldPrice: item.old_price,`
- `66: insuranceAvailable: item.insurance_availability, homeCollectionAvailable: item.home_collection_availability,`
- `73: export function extractLabServices(payload: unknown) { return rowsFrom(payload).flatMap((value) => { const item = parseLabService(value); return item ? [item] : []; }); }`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
