# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/prescriptions.ts`
- **Member SHA-256:** `6a7d0c3075af972558b92e8cf55963ae39e807140d52413382e1b8b2ac5035a4`
- **Line count:** 51
- **Read range:** `1-51`
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
- `6: export type PrescriptionSummary = { id: string; state?: string; itemCount: number; createdAt?: string; doctorName?: string; medicationNames: string[]; items: PrescriptionItem[] };`
- `36: if (!id.success || !record) return null;`
- `37: const state = typeof record.state === "string" && record.state.trim() ? record.state : undefined;`
- `43: return { id: id.data, state, itemCount: items.length, createdAt, doctorName, medicationNames, items };`
### payment_insurance_relevance
- `12: function listFrom(payload: unknown): unknown[] {`
- `13: if (Array.isArray(payload)) return payload;`
- `14: const root = asRecord(payload);`
- `46: export function extractPrescriptionSummaries(payload: unknown) {`
- `47: return listFrom(payload).flatMap((item) => {`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
