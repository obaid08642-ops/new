# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/medicines.ts`
- **Member SHA-256:** `972905bc14176eccf2977744ef0f27661c6393dd969cd492babe6c84d8aabbcc`
- **Line count:** 77
- **Read range:** `1-77`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: const searchSchema = z.object({ q: z.string().trim().max(80).optional(), page: z.coerce.number().int().min(1).max(100).default(1) });`
- `55: export function parseMedicineSearch(value: { q?: string | string[]; page?: string | string[] }) {`
- `57: const page = typeof value.page === "string" ? value.page : undefined;`
- `58: return searchSchema.parse({ q, page });`
- `61: export function medicineQuery(search: { q?: string; page: number }) {`
- `62: const params = new URLSearchParams({ limit: "24", page: String(search.page) });`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `15: availabilityStatus?: string;`
- `37: if (!id.success || !record) return null;`
- `47: availabilityStatus: text(record, "availability_status"),`
### payment_insurance_relevance
- `22: function listFrom(payload: unknown): unknown[] {`
- `23: if (Array.isArray(payload)) return payload;`
- `24: const root = asRecord(payload);`
- `67: export function extractMedicineRows(payload: unknown) {`
- `68: return listFrom(payload).flatMap((item) => {`
- `74: export function extractMedicineDetail(payload: unknown) {`
- `75: const root = asRecord(payload);`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
