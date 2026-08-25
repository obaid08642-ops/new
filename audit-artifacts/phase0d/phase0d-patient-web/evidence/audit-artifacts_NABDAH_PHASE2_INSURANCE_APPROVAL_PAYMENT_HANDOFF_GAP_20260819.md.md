# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_INSURANCE_APPROVAL_PAYMENT_HANDOFF_GAP_20260819.md`
- **Member SHA-256:** `9f751388d6cf6911802cadb29b3e78e44dd0b282b8c8f2bb5c8576a43c4a644f`
- **Line count:** 25
- **Read range:** `1-25`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: `insurance/approval-pending.tsx` correctly polls insurance requests when it receives a `requestId` or `bookingId`. When an insurance request is rejected or approved with a copay, however, it sends the patient to:`
- `8: router.push('/payments/processing')`
- `11: No payment transaction, payment URL, `moyasarId`, booking ID, booking kind, or amount is passed to that destination.`
- `17: | Rejected insurance request | Cash CTA routes to generic payment processing with no payable entity or payment intent | Route to a real booking/order payment-start flow bound to the rejected owned entity, or present an explicit return-to-bo`
- `18: | Approved request with copay | Confirm CTA routes to generic payment processing with no request/booking/payment metadata | Create an owned copay payment intent server-side and pass only its returned transaction/payment URL metadata to the `
- `19: | Request lookup without `requestId` or `bookingId` | UI selects `arr[0]` from the caller’s requests | Prevent accidental linkage to the wrong owned request; require an explicit request/booking identifier |`
- `20: | Total/coplay display | `params.amount` is client navigation data and can be used to derive display values when a server copay is unavailable | Use server-authoritative booking/request totals and copay amounts only; do not derive financial`
- `21: | Polling error state | If no request is found or polling repeatedly fails, screen remains pending | Add not-found/error/retry and safe exit state; do not imply a current approval review indefinitely |`
- `25: This is a **P0 financial workflow defect**. Insurance approval must not lead to a generic payment UI until a server-owned booking/order and a server-created payment/coplay intent are bound end to end. The flow remains **FIX/BLOCKED** pendin`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: ## Confirmed failure path`
- `5: `insurance/approval-pending.tsx` correctly polls insurance requests when it receives a `requestId` or `bookingId`. When an insurance request is rejected or approved with a copay, however, it sends the patient to:`
- `13: `payments/processing.tsx` requires `moyasarId` or `walletTopupId` before it can call either verification endpoint. Its poll callback returns immediately when both are missing. The Patient is therefore sent to a generic processing UI that ca`
- `15: | Scope | Confirmed issue | Required remediation |`
- `17: | Rejected insurance request | Cash CTA routes to generic payment processing with no payable entity or payment intent | Route to a real booking/order payment-start flow bound to the rejected owned entity, or present an explicit return-to-bo`
- `18: | Approved request with copay | Confirm CTA routes to generic payment processing with no request/booking/payment metadata | Create an owned copay payment intent server-side and pass only its returned transaction/payment URL metadata to the `
- `20: | Total/coplay display | `params.amount` is client navigation data and can be used to derive display values when a server copay is unavailable | Use server-authoritative booking/request totals and copay amounts only; do not derive financial`
- `21: | Polling error state | If no request is found or polling repeatedly fails, screen remains pending | Add not-found/error/retry and safe exit state; do not imply a current approval review indefinitely |`
- `25: This is a **P0 financial workflow defect**. Insurance approval must not lead to a generic payment UI until a server-owned booking/order and a server-created payment/coplay intent are bound end to end. The flow remains **FIX/BLOCKED** pendin`
### payment_insurance_relevance
- `1: # Phase 2 Patient — insurance approval to payment handoff gap`
- `5: `insurance/approval-pending.tsx` correctly polls insurance requests when it receives a `requestId` or `bookingId`. When an insurance request is rejected or approved with a copay, however, it sends the patient to:`
- `8: router.push('/payments/processing')`
- `11: No payment transaction, payment URL, `moyasarId`, booking ID, booking kind, or amount is passed to that destination.`
- `13: `payments/processing.tsx` requires `moyasarId` or `walletTopupId` before it can call either verification endpoint. Its poll callback returns immediately when both are missing. The Patient is therefore sent to a generic processing UI that ca`
- `17: | Rejected insurance request | Cash CTA routes to generic payment processing with no payable entity or payment intent | Route to a real booking/order payment-start flow bound to the rejected owned entity, or present an explicit return-to-bo`
- `18: | Approved request with copay | Confirm CTA routes to generic payment processing with no request/booking/payment metadata | Create an owned copay payment intent server-side and pass only its returned transaction/payment URL metadata to the `
- `20: | Total/coplay display | `params.amount` is client navigation data and can be used to derive display values when a server copay is unavailable | Use server-authoritative booking/request totals and copay amounts only; do not derive financial`
- `25: This is a **P0 financial workflow defect**. Insurance approval must not lead to a generic payment UI until a server-owned booking/order and a server-created payment/coplay intent are bound end to end. The flow remains **FIX/BLOCKED** pendin`
### error_empty_loading_retry_cancel
- `5: `insurance/approval-pending.tsx` correctly polls insurance requests when it receives a `requestId` or `bookingId`. When an insurance request is rejected or approved with a copay, however, it sends the patient to:`
- `13: `payments/processing.tsx` requires `moyasarId` or `walletTopupId` before it can call either verification endpoint. Its poll callback returns immediately when both are missing. The Patient is therefore sent to a generic processing UI that ca`
- `21: | Polling error state | If no request is found or polling repeatedly fails, screen remains pending | Add not-found/error/retry and safe exit state; do not imply a current approval review indefinitely |`
- `25: This is a **P0 financial workflow defect**. Insurance approval must not lead to a generic payment UI until a server-owned booking/order and a server-created payment/coplay intent are bound end to end. The flow remains **FIX/BLOCKED** pendin`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
