# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/offlineQueue.ts`
- **Member SHA-256:** `69adc7bbc60806fa780023f1b28af1eb9ec4a1c56d62de8191120ae37108229a`
- **Line count:** 39
- **Read range:** `1-39`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `14: /** A message must be retried only after a published, owner-bound chat contract exists. */`
### state_transitions
- `15: export class OfflineMessageQueueDisabledError extends Error {`
- `16: constructor() { super('offline_message_queue_disabled_pending_contract'); }`
- `30: throw new OfflineMessageQueueDisabledError();`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `3: export interface OfflineMessage {`
- `12: const OFFLINE_QUEUE_KEY = '@nabdah_offline_messages';`
- `15: export class OfflineMessageQueueDisabledError extends Error {`
- `16: constructor() { super('offline_message_queue_disabled_pending_contract'); }`
- `20: try { await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY); } catch { /* cleanup only */ }`
- `23: export async function getOfflineMessages(): Promise<OfflineMessage[]> {`
- `28: export async function addOfflineMessage(_msg: OfflineMessage): Promise<never> {`
- `30: throw new OfflineMessageQueueDisabledError();`
- `33: export async function removeOfflineMessage(_id: string): Promise<void> {`
- `37: export async function clearOfflineQueue(): Promise<void> {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
