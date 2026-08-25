# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/reminders.ts`
- **Member SHA-256:** `209bf00c1bfd5d160893715cf9c6ee72c8d57c725103426c18cf10901bc8710f`
- **Line count:** 42
- **Read range:** `1-42`
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
- `6: export type MedicationDoseSummary = { timeKey: string; status: "pending" | "taken" | "skipped" | "missed" };`
- `23: if (!id.success || !record) return null;`
- `26: const times = Array.isArray(record.times) ? record.times.flatMap((item) => timeSchema.safeParse(item).success ? [item] : []) : [];`
- `30: const timeKey = timeSchema.safeParse(dose?.time_key).success ? dose?.time_key as string : null;`
- `31: const status = ["pending", "taken", "skipped", "missed"].includes(String(dose?.status)) ? dose?.status as MedicationDoseSummary["status"] : null;`
- `32: return timeKey && status ? [{ timeKey, status }] : [];`
### payment_insurance_relevance
- `13: function listFrom(payload: unknown): unknown[] {`
- `14: if (Array.isArray(payload)) return payload;`
- `15: const root = asRecord(payload);`
- `37: export function extractMedicationReminderSummaries(payload: unknown) {`
- `38: return listFrom(payload).flatMap((item) => {`
### error_empty_loading_retry_cancel
- `6: export type MedicationDoseSummary = { timeKey: string; status: "pending" | "taken" | "skipped" | "missed" };`
- `31: const status = ["pending", "taken", "skipped", "missed"].includes(String(dose?.status)) ? dose?.status as MedicationDoseSummary["status"] : null;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
