# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/domain/entities/Commerce.ts`
- **Member SHA-256:** `dd2a15058ad8dfedba673d5b38a75ddf61facda669333bb3ac5823098ea5c902`
- **Line count:** 98
- **Read range:** `1-98`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `22: status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';`
- `33: status: 'pending' | 'success' | 'failed' | 'refunded';`
- `93: uploaderId: string;`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `15: patientId: string;`
- `16: providerId: string;`
- `73: targetId: string; // providerId, productId, etc.`
### state_transitions
- `22: status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';`
- `33: status: 'pending' | 'success' | 'failed' | 'refunded';`
- `76: status: 'pending' | 'approved' | 'rejected';`
### payment_insurance_relevance
- `11: unitPrice: Money;`
- `18: subtotal: Money;`
- `19: tax: Money;`
- `21: total: Money;`
- `23: paymentId?: string;`
- `27: export interface Payment extends BaseEntity {`
- `32: method: 'card' | 'wallet' | 'cash' | 'apple-pay' | 'stc-pay';`
- `33: status: 'pending' | 'success' | 'failed' | 'refunded';`
- `37: export interface Invoice extends BaseEntity {`
- `38: paymentId: string;`
- `42: totalAmount: Money;`
- `59: export interface Wallet extends BaseEntity {`
### error_empty_loading_retry_cancel
- `22: status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';`
- `33: status: 'pending' | 'success' | 'failed' | 'refunded';`
- `76: status: 'pending' | 'approved' | 'rejected';`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
