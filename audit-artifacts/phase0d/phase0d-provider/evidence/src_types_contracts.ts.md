# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/types/contracts.ts`
- **Member SHA-256:** `338ba19890e5a44b912c3fb4dac0a2411b338f185ff31327a412d2cdc7f5ef56`
- **Line count:** 216
- **Read range:** `1-216`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `57: CANCELLED = 'CANCELLED',`
- `104: CANCELLED = 'cancelled',`
- `159: CANCELLED = 'CANCELLED',`
- `163: [OrderState.CREATED]: [OrderState.VALIDATED, OrderState.CANCELLED],`
- `164: [OrderState.VALIDATED]: [OrderState.PHARMACY_RECEIVED, OrderState.CANCELLED],`
- `165: [OrderState.PHARMACY_RECEIVED]: [OrderState.ACCEPTED, OrderState.REJECTED, OrderState.CANCELLED],`
- `166: [OrderState.ACCEPTED]: [OrderState.PREPARING, OrderState.PARTIALLY_FULFILLED, OrderState.CANCELLED],`
- `167: [OrderState.REJECTED]: [OrderState.ESCALATED_TO_ADMIN, OrderState.CANCELLED],`
- `168: [OrderState.PARTIALLY_FULFILLED]: [OrderState.PREPARING, OrderState.CANCELLED],`
- `169: [OrderState.PREPARING]: [OrderState.READY_FOR_DISPATCH, OrderState.CANCELLED],`
- `170: [OrderState.READY_FOR_DISPATCH]: [OrderState.ASSIGNED_TO_DELIVERY, OrderState.DELIVERED, OrderState.CANCELLED],`
- `171: [OrderState.ASSIGNED_TO_DELIVERY]: [OrderState.OUT_FOR_DELIVERY, OrderState.CANCELLED],`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `4: export enum UserRole {`
- `10: HOSPITAL_ADMIN = 'hospital_admin',`
- `11: BRANCH_ADMIN = 'branch_admin',`
- `19: ADMIN = 'admin',`
- `21: SUPER_ADMIN = 'super_admin',`
- `58: ESCALATED_TO_ADMIN = 'ESCALATED_TO_ADMIN',`
- `76: ADMIN_NOTIFIED = 'ADMIN_NOTIFIED',`
- `167: [OrderState.REJECTED]: [OrderState.ESCALATED_TO_ADMIN, OrderState.CANCELLED],`
- `172: [OrderState.OUT_FOR_DELIVERY]: [OrderState.DELIVERED, OrderState.ESCALATED_TO_ADMIN],`
- `175: [OrderState.ESCALATED_TO_ADMIN]: [`
- `186: [EmergencyState.TRIGGERED]: [EmergencyState.LOCATION_CAPTURED, EmergencyState.ADMIN_NOTIFIED],`
- `187: [EmergencyState.LOCATION_CAPTURED]: [EmergencyState.ADMIN_NOTIFIED],`
### state_transitions
- `38: export enum ProviderStatus {`
- `39: PENDING = 'pending',`
- `41: REJECTED = 'rejected',`
- `45: export enum OrderState {`
- `50: REJECTED = 'REJECTED',`
- `56: DELIVERED = 'DELIVERED',`
- `57: CANCELLED = 'CANCELLED',`
- `59: PENDING_INSURANCE = 'PENDING_INSURANCE',`
- `60: APPROVED = 'APPROVED',`
- `64: export enum PrescriptionState {`
- `68: APPROVED = 'APPROVED',`
- `73: export enum EmergencyState {`
### payment_insurance_relevance
- `59: PENDING_INSURANCE = 'PENDING_INSURANCE',`
- `180: [OrderState.PENDING_INSURANCE]: [OrderState.APPROVED, OrderState.PARTIAL_APPROVAL, OrderState.REJECTED, OrderState.CANCELLED],`
### error_empty_loading_retry_cancel
- `39: PENDING = 'pending',`
- `57: CANCELLED = 'CANCELLED',`
- `59: PENDING_INSURANCE = 'PENDING_INSURANCE',`
- `104: CANCELLED = 'cancelled',`
- `114: FAILED = 'FAILED',`
- `159: CANCELLED = 'CANCELLED',`
- `163: [OrderState.CREATED]: [OrderState.VALIDATED, OrderState.CANCELLED],`
- `164: [OrderState.VALIDATED]: [OrderState.PHARMACY_RECEIVED, OrderState.CANCELLED],`
- `165: [OrderState.PHARMACY_RECEIVED]: [OrderState.ACCEPTED, OrderState.REJECTED, OrderState.CANCELLED],`
- `166: [OrderState.ACCEPTED]: [OrderState.PREPARING, OrderState.PARTIALLY_FULFILLED, OrderState.CANCELLED],`
- `167: [OrderState.REJECTED]: [OrderState.ESCALATED_TO_ADMIN, OrderState.CANCELLED],`
- `168: [OrderState.PARTIALLY_FULFILLED]: [OrderState.PREPARING, OrderState.CANCELLED],`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
