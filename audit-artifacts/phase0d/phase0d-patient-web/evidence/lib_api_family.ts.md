# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/family.ts`
- **Member SHA-256:** `fbd708ece9c38a92c94646dd8a89b5708ac3f3345bf722e1bb15694474fceff2`
- **Line count:** 34
- **Read range:** `1-34`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: export type FamilyMember = { id: string; role?: "owner" | "member"; joinedAt?: string; displayName?: string; relation?: string };`
- `22: const role = record.role === "owner" || record.role === "member" ? record.role : undefined;`
- `26: return { id: id.data, role, joinedAt, displayName, relation };`
### state_transitions
- `21: if (!id.success || !record) return null;`
### payment_insurance_relevance
- `11: function listFrom(payload: unknown): unknown[] {`
- `12: if (Array.isArray(payload)) return payload;`
- `13: const root = asRecord(payload);`
- `29: export function extractFamilyMembers(payload: unknown) {`
- `30: return listFrom(payload).flatMap((item) => {`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
