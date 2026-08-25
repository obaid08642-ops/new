# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/dashboard.ts`
- **Member SHA-256:** `1fca8368c2bde2be781fee4e1111250cd28efd438d2912eb1b9451c967cb168a`
- **Line count:** 31
- **Read range:** `1-31`
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
- `2: export type DashboardAppointment = { id: string; doctorName: string | null; dateLabel: string | null; status: string | null };`
- `29: status: text(data?.status) ?? null,`
### payment_insurance_relevance
- `12: export function parseDashboardProfile(payload: unknown): DashboardProfile {`
- `13: const root = record(payload);`
- `18: export function parseDashboardAppointment(payload: unknown): DashboardAppointment | null {`
- `19: const root = record(payload);`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
