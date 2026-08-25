# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/insurance-copay-contract.ts`
- **Member SHA-256:** `fbad51878503ba4d876475d3a01bcad0d6322ec70405a08c2d7c42a1003af1fb`
- **Line count:** 34
- **Read range:** `1-34`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: export type InsuranceCopayState = 'PENDING_PROVIDER_REVIEW' | 'APPROVED_FULL' | 'COPAY_PENDING' | 'COPAY_PAID' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';`
- `5: booking_id: string;`
- `6: booking_kind: string;`
- `17: const bookingId = typeof request.booking_id === 'string' ? request.booking_id.trim() : '';`
- `21: const allowed = new Set<InsuranceCopayState>(['PENDING_PROVIDER_REVIEW', 'APPROVED_FULL', 'COPAY_PENDING', 'COPAY_PAID', 'REJECTED', 'EXPIRED', 'CANCELLED']);`
- `22: if (!id || !bookingId || !allowed.has(state as InsuranceCopayState) || !Number.isFinite(price) || price <= 0 || !Number.isFinite(copay) || copay < 0) {`
- `25: return { id, booking_id: bookingId, booking_kind: typeof request.booking_kind === 'string' ? request.booking_kind : '', state: state as InsuranceCopayState, price, copay_amount: copay, policy: request.policy as InsuranceCopayRequest['policy`
- `28: export function insurancePaymentAction(request: InsuranceCopayRequest): 'provider_review' | 'settle_zero_copay' | 'checkout_copay' | 'paid' | 'unavailable' {`
- `31: if (request.state === 'COPAY_PENDING' && request.copay_amount > 0) return 'checkout_copay';`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: export type InsuranceCopayState = 'PENDING_PROVIDER_REVIEW' | 'APPROVED_FULL' | 'COPAY_PENDING' | 'COPAY_PAID' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';`
- `7: state: InsuranceCopayState;`
- `14: if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('insurance request not found');`
- `18: const state = typeof request.state === 'string' ? request.state : '';`
- `21: const allowed = new Set<InsuranceCopayState>(['PENDING_PROVIDER_REVIEW', 'APPROVED_FULL', 'COPAY_PENDING', 'COPAY_PAID', 'REJECTED', 'EXPIRED', 'CANCELLED']);`
- `22: if (!id || !bookingId || !allowed.has(state as InsuranceCopayState) || !Number.isFinite(price) || price <= 0 || !Number.isFinite(copay) || copay < 0) {`
- `23: throw new Error('invalid insurance request contract');`
- `25: return { id, booking_id: bookingId, booking_kind: typeof request.booking_kind === 'string' ? request.booking_kind : '', state: state as InsuranceCopayState, price, copay_amount: copay, policy: request.policy as InsuranceCopayRequest['policy`
- `29: if (request.state === 'PENDING_PROVIDER_REVIEW') return 'provider_review';`
- `30: if (request.state === 'APPROVED_FULL' && request.copay_amount === 0) return 'settle_zero_copay';`
- `31: if (request.state === 'COPAY_PENDING' && request.copay_amount > 0) return 'checkout_copay';`
- `32: if (request.state === 'COPAY_PAID') return 'paid';`
### payment_insurance_relevance
- `1: export type InsuranceCopayState = 'PENDING_PROVIDER_REVIEW' | 'APPROVED_FULL' | 'COPAY_PENDING' | 'COPAY_PAID' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';`
- `3: export type InsuranceCopayRequest = {`
- `7: state: InsuranceCopayState;`
- `8: price: number;`
- `9: copay_amount: number;`
- `13: export function parseInsuranceCopayRequest(value: unknown): InsuranceCopayRequest {`
- `14: if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('insurance request not found');`
- `19: const price = Number(request.price);`
- `20: const copay = Number(request.copay_amount ?? 0);`
- `21: const allowed = new Set<InsuranceCopayState>(['PENDING_PROVIDER_REVIEW', 'APPROVED_FULL', 'COPAY_PENDING', 'COPAY_PAID', 'REJECTED', 'EXPIRED', 'CANCELLED']);`
- `22: if (!id || !bookingId || !allowed.has(state as InsuranceCopayState) || !Number.isFinite(price) || price <= 0 || !Number.isFinite(copay) || copay < 0) {`
- `23: throw new Error('invalid insurance request contract');`
### error_empty_loading_retry_cancel
- `1: export type InsuranceCopayState = 'PENDING_PROVIDER_REVIEW' | 'APPROVED_FULL' | 'COPAY_PENDING' | 'COPAY_PAID' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';`
- `14: if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('insurance request not found');`
- `21: const allowed = new Set<InsuranceCopayState>(['PENDING_PROVIDER_REVIEW', 'APPROVED_FULL', 'COPAY_PENDING', 'COPAY_PAID', 'REJECTED', 'EXPIRED', 'CANCELLED']);`
- `23: throw new Error('invalid insurance request contract');`
- `29: if (request.state === 'PENDING_PROVIDER_REVIEW') return 'provider_review';`
- `31: if (request.state === 'COPAY_PENDING' && request.copay_amount > 0) return 'checkout_copay';`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
