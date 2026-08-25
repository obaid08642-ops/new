# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/platform/payment/PaymentProvider.ts`
- **Member SHA-256:** `d441c148da41bdc1d479deac7c346987120d2ef5741ebfba6ae9b282ee8b6dfd`
- **Line count:** 47
- **Read range:** `1-47`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `34: * Refund a previously successful transaction.`
- `36: refundPayment(transactionId: string, amount?: Money): Promise<PaymentResponse>;`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `13: status: 'success' | 'failed' | 'pending_auth';`
- `34: * Refund a previously successful transaction.`
- `36: refundPayment(transactionId: string, amount?: Money): Promise<PaymentResponse>;`
- `44: * Check the final status of a pending transaction.`
- `46: checkStatus(transactionId: string): Promise<PaymentResponse['status']>;`
### payment_insurance_relevance
- `3: export interface PaymentRequest {`
- `7: method: 'card' | 'wallet' | 'cash' | 'apple-pay';`
- `11: export interface PaymentResponse {`
- `20: payload: any;`
- `24: * Interface that all external payment gateways (Stripe, PayTabs, Moyasar, etc.) MUST implement.`
- `27: export interface PaymentProvider {`
- `29: * Initiate a payment transaction.`
- `31: processPayment(request: PaymentRequest): Promise<PaymentResponse>;`
- `34: * Refund a previously successful transaction.`
- `36: refundPayment(transactionId: string, amount?: Money): Promise<PaymentResponse>;`
- `46: checkStatus(transactionId: string): Promise<PaymentResponse['status']>;`
### error_empty_loading_retry_cancel
- `13: status: 'success' | 'failed' | 'pending_auth';`
- `44: * Check the final status of a pending transaction.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
