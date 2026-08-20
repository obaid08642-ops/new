# Phase 2 Patient — insurance payment split missing Backend contract

## Confirmed finding

`app/insurance/payment-split.tsx` calls:

```http
POST /insurance/payment-confirm
```

with client-computed service total, patient share, company share, and a selected payment method. A source-wide Backend search found **no `payment-confirm` route** in the authoritative Backend tree.

The current backend insurance flow exposes request/coverage/coplay mechanisms, including the alias `POST /patient/pay-copay`, but not the client-called `POST /insurance/payment-confirm` contract.

## Impact

| Concern | Result | Required disposition |
|---|---|---|
| Confirmation call | The Patient payment-split flow fails at the final API call | **P0 FIX — replace route with a documented, server-owned flow; do not add a permissive endpoint that trusts client totals** |
| Payment amounts | UI derives total, company share, and patient share from route parameters plus coverage response | Client can present/submit a split not bound to a real owned booking or insurance request | **P0 FIX — load server-owned request/booking by ID and calculate/pay copay server-side** |
| Saved card selection | UI presents a card identifier but sends only an opaque `payment_method` value and no payment intent | No verifiable card/cash/copup payment execution contract exists in this path | **P0 FIX — create payment intent or cash acknowledgment according to the approved request state** |
| Redirect result | UI derives target screen from client `serviceType` and response fallback fields | A failed/malformed response can send the user to an unrelated success/tracking route | **FIX — return canonical entity kind/id/state from the server and route only from that response** |

## Decision

The Insurance Payment Split feature is **P0 FIX/BLOCKED**. It must not be presented as a live payment path until the frontend uses a documented server-owned copay/payment contract, including ownership, approved-state checks, idempotency, and sandbox coverage for every service kind.
