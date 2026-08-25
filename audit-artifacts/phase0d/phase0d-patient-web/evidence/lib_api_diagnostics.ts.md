# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/diagnostics.ts`
- **Member SHA-256:** `dd4c98e54571ee2eb3fa86e4d5cfa539cff3af0542b03b6456508346159c8128`
- **Line count:** 72
- **Read range:** `1-72`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: const bookingIdSchema = z.string().uuid();`
- `8: export type DiagnosticBooking = {`
- `38: function bookingFrom(value: unknown): DiagnosticBooking | null {`
- `40: const id = bookingIdSchema.safeParse(record?.id);`
- `58: export function parseDiagnosticBookingId(value: string) {`
- `59: return bookingIdSchema.safeParse(value);`
- `62: export function extractDiagnosticBookings(payload: unknown) {`
- `64: const booking = bookingFrom(item);`
- `65: return booking ? [booking] : [];`
- `69: export function extractDiagnosticBooking(payload: unknown) {`
- `71: return bookingFrom(asRecord(root?.data) ?? root);`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `10: state?: string;`
- `41: if (!id.success || !record) return null;`
- `44: state: text(record, ["state", "status"]),`
### payment_insurance_relevance
- `23: function listFrom(payload: unknown): unknown[] {`
- `24: if (Array.isArray(payload)) return payload;`
- `25: const root = asRecord(payload);`
- `62: export function extractDiagnosticBookings(payload: unknown) {`
- `63: return listFrom(payload).flatMap((item) => {`
- `69: export function extractDiagnosticBooking(payload: unknown) {`
- `70: const root = asRecord(payload);`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
