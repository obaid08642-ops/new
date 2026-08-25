# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/home-care.ts`
- **Member SHA-256:** `f28ef1b562645b87350cbc7c375096285738d0a62da24b090ea636560ec40ab8`
- **Line count:** 51
- **Read range:** `1-51`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: const bookingIdSchema = z.string().uuid();`
- `5: export type HomeCareBooking = {`
- `31: function bookingFrom(value: unknown): HomeCareBooking | null {`
- `33: const id = bookingIdSchema.safeParse(record?.id);`
- `46: export function extractHomeCareBookings(payload: unknown) {`
- `48: const booking = bookingFrom(item);`
- `49: return booking ? [booking] : [];`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `11: sessionsCount?: number;`
- `41: sessionsCount: typeof record.sessions_count === "number" && Number.isInteger(record.sessions_count) && record.sessions_count > 0 ? record.sessions_count : undefined,`
### state_transitions
- `9: state?: string;`
- `34: if (!id.success || !record) return null;`
- `39: state: text(record, "state"),`
### payment_insurance_relevance
- `19: function listFrom(payload: unknown): unknown[] {`
- `20: if (Array.isArray(payload)) return payload;`
- `21: const root = asRecord(payload);`
- `46: export function extractHomeCareBookings(payload: unknown) {`
- `47: return listFrom(payload).flatMap((item) => {`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
