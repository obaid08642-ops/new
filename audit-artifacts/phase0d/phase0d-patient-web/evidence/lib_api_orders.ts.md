# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/orders.ts`
- **Member SHA-256:** `3a14a1c3e1ae31bc94b40acb346f31ff8a3550abe178ec8cc6979b9ebdd38243`
- **Line count:** 62
- **Read range:** `1-62`
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
- `5: export type PatientOrderSummary = { id: string; status?: string; reference?: string; createdAt?: string; itemCount?: number; total?: number; currency?: string };`
- `33: return [{ id, status: stringField(record, ["effective_status", "status", "state"]), reference: stringField(record, ["orderNumber", "reference", "code"]), createdAt, itemCount: items.length || undefined, total, currency }];`
- `37: export type PatientOrderTracking = { status?: string; pharmacyName?: string; deliveryMode?: string; etaMinutes?: number; total?: number; currency?: string; updatedAt?: string };`
- `49: status: stringField(record, ["state", "effective_status", "status"]),`
### payment_insurance_relevance
- `5: export type PatientOrderSummary = { id: string; status?: string; reference?: string; createdAt?: string; itemCount?: number; total?: number; currency?: string };`
- `18: export function extractOrderRows(payload: unknown): PatientOrderSummary[] {`
- `19: const root = asRecord(payload);`
- `20: const candidate = Array.isArray(payload) ? payload : [root?.data, root?.orders, root?.items].find(Array.isArray);`
- `28: const totals = asRecord(record.totals);`
- `29: const rawTotal = totals?.total ?? record.total ?? record.total_price;`
- `30: const total = typeof rawTotal === "number" && Number.isFinite(rawTotal) ? rawTotal : undefined;`
- `32: const currency = stringField(totals ?? {}, ["currency"]) ?? stringField(record, ["currency"]);`
- `33: return [{ id, status: stringField(record, ["effective_status", "status", "state"]), reference: stringField(record, ["orderNumber", "reference", "code"]), createdAt, itemCount: items.length || undefined, total, currency }];`
- `37: export type PatientOrderTracking = { status?: string; pharmacyName?: string; deliveryMode?: string; etaMinutes?: number; total?: number; currency?: string; updatedAt?: string };`
- `39: export function extractOrderTracking(payload: unknown): PatientOrderTracking | null {`
- `40: const root = asRecord(payload);`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
