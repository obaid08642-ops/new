# Phase 2 Patient — insurance approval to payment handoff gap

## Confirmed failure path

`insurance/approval-pending.tsx` correctly polls insurance requests when it receives a `requestId` or `bookingId`. When an insurance request is rejected or approved with a copay, however, it sends the patient to:

```ts
router.push('/payments/processing')
```

No payment transaction, payment URL, `moyasarId`, booking ID, booking kind, or amount is passed to that destination.

`payments/processing.tsx` requires `moyasarId` or `walletTopupId` before it can call either verification endpoint. Its poll callback returns immediately when both are missing. The Patient is therefore sent to a generic processing UI that cannot initiate or verify any payment and can remain in a misleading loading state.

| Scope | Confirmed issue | Required remediation |
|---|---|---|
| Rejected insurance request | Cash CTA routes to generic payment processing with no payable entity or payment intent | Route to a real booking/order payment-start flow bound to the rejected owned entity, or present an explicit return-to-booking choice |
| Approved request with copay | Confirm CTA routes to generic payment processing with no request/booking/payment metadata | Create an owned copay payment intent server-side and pass only its returned transaction/payment URL metadata to the payment screen |
| Request lookup without `requestId` or `bookingId` | UI selects `arr[0]` from the caller’s requests | Prevent accidental linkage to the wrong owned request; require an explicit request/booking identifier |
| Total/coplay display | `params.amount` is client navigation data and can be used to derive display values when a server copay is unavailable | Use server-authoritative booking/request totals and copay amounts only; do not derive financial status from route parameters |
| Polling error state | If no request is found or polling repeatedly fails, screen remains pending | Add not-found/error/retry and safe exit state; do not imply a current approval review indefinitely |

## Safety decision

This is a **P0 financial workflow defect**. Insurance approval must not lead to a generic payment UI until a server-owned booking/order and a server-created payment/coplay intent are bound end to end. The flow remains **FIX/BLOCKED** pending source remediation and sandbox verification.
