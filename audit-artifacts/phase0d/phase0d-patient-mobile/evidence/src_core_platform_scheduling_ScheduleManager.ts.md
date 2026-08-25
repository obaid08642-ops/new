# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/platform/scheduling/ScheduleManager.ts`
- **Member SHA-256:** `2ecd9f50a5c4c78a333d99c8949e5a62fd099248e21e959aa5817866b32decd1`
- **Line count:** 92
- **Read range:** `1-92`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `18: status: string; // 'locked', 'confirmed', 'cancelled'`
- `57: * Block a specific time slot (e.g., when a patient starts checkout).`
- `77: * Confirm and permanently book a slot.`
- `79: public async confirmBooking(providerId: string, date: Date, slot: TimeSlot): Promise<void> {`
- `80: this.log.info(`Confirmed booking for ${providerId}`);`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `8: providerId: string;`
- `32: public async getAvailableSlots(providerId: string, range: DateRange): Promise<Record<string, TimeSlot[]>> {`
- `33: this.log.debug(`Fetching slots for ${providerId} from ${range.startDate} to ${range.endDate}`);`
- `43: .where('provider_id', providerId);`
- `59: public async holdSlot(providerId: string, date: Date, slot: TimeSlot, lockDurationMs: number): Promise<boolean> {`
- `60: this.log.info(`Holding slot for ${providerId} at ${date} - ${slot.startTime}`);`
- `68: provider_id: providerId,`
- `79: public async confirmBooking(providerId: string, date: Date, slot: TimeSlot): Promise<void> {`
- `80: this.log.info(`Confirmed booking for ${providerId}`);`
- `84: .where('provider_id', providerId)`
### state_transitions
- `18: status: string; // 'locked', 'confirmed', 'cancelled'`
- `48: // For this example, we return base slots minus confirmed/locked ones`
- `70: status: 'locked',`
- `80: this.log.info(`Confirmed booking for ${providerId}`);`
- `85: .where('status', 'locked'); // Simplification`
- `89: await repo.update(locked[0].id, { status: 'confirmed', updated_at: Date.now() });`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `18: status: string; // 'locked', 'confirmed', 'cancelled'`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
