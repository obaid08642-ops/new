# Runtime check, Batch 1d (patient-app: checkout, payment, insurance decision, payment result), 2026-10-06

Backend: http://localhost:3002/api/v1 (local test database, NODE_ENV=test), seeded patient `+966509999999`, a guest session (`POST /auth/guest`) and no session. Only GET calls and the two POSTs that cannot change anything (`POST /payments/verify/<unknown id>` answers 404; no transaction exists) were executed; every other POST is listed as not executed (it would change data: orders, money, insurance state). Script: a plain fetch loop, output pasted as printed. The seeded patient has two orders: `761e9693-...` (status `ready_for_split`, `governed_state: null`, `payment_status` absent, 3 items, fulfillment delivery, payment_mode cash) and `b8d1e5c8-...` (`draft`, `governed_state: null`). Neither has a selected offer or an accepted quote, so no order could be paid, insured or confirmed.

## Calls of the screens

| Screen | Call | Executed |
|---|---|---|
| `/pharmacy/checkout` | GET `/prescriptions/:id` | no real id (the seeded patient has no prescription: `/prescriptions/active` answers `[]`); shape from `GET /prescriptions/:id` of 1b |
| `/pharmacy/checkout` | GET `/users/me/addresses` (via `resolveEffectiveAddress`) | yes (below): `[]` for the seeded patient |
| `/pharmacy/checkout` | POST `/patient/pharmacy/orders`, POST `.../orders/:id/submit` | not executed (mutation); body checked against `CreateDto` and `DeliveryAddressDto` by reading them |
| `/pharmacy/payment`, `/pharmacy/insurance-decision`, `/pharmacy/order-confirm` | GET `/patient/pharmacy/orders/:id` | yes |
| `/pharmacy/payment` | GET `/payments/pharmacy/:id/capabilities` | yes: refusals only (no accepted quote exists) |
| `/pharmacy/payment` | POST `/payments/intent/pharmacy/:id` | not executed (it would create a transaction and ask the gateway) |
| `/pharmacy/insurance-decision` | POST `.../insurance/co-pay|self-pay/accept`, POST `.../insurance-rejection/cancel` | not executed |
| `/payments/result` | POST `/payments/verify/:txn` | yes, with an unknown id only (404) |
| `/payments/result` | GET `/moyasar/payments/sync/:id` | yes, with an unknown id only (200 empty) |

## Answers (patient / guest / none)

```
orders of the seeded patient: 2 first: 761e9693-e517-4ad6-ae20-330363005b28 ready_for_split
patient GET /patient/pharmacy/orders/:orderId => 200 {payment_method,id,patient_account_id,status,items,delivery_address,patient_notes,fulfillment}
patient GET /payments/pharmacy/:orderId/capabilities => 400 {message,error,statusCode} message="selected_quote_required"
patient GET /payments/pharmacy/does-not-exist/capabilities => 404 {message,error,statusCode} message="booking_not_found"
patient POST /payments/verify/does-not-exist => 404 {message,error,statusCode} message="txn_not_found"
patient GET /moyasar/payments/sync/pay_doesnotexist => 200 empty
patient GET /prescriptions/active => 200 array(0)
patient GET /users/me/addresses => 200 array(0)
patient GET /patient/pharmacy/orders/does-not-exist => 404 {message,error,statusCode} message="order_not_found"
guest GET /patient/pharmacy/orders/:orderId => 403 {message,error,statusCode} message="not_yours"
guest GET /payments/pharmacy/:orderId/capabilities => 400 {message,error,statusCode} message="not_authorized"
guest GET /payments/pharmacy/does-not-exist/capabilities => 404 {message,error,statusCode} message="booking_not_found"
guest POST /payments/verify/does-not-exist => 404 {message,error,statusCode} message="txn_not_found"
guest GET /moyasar/payments/sync/pay_doesnotexist => 200 empty
guest GET /prescriptions/active => 200 array(0)
guest GET /users/me/addresses => 200 array(0)
guest GET /patient/pharmacy/orders/does-not-exist => 404 {message,error,statusCode} message="order_not_found"
none GET (every call above) => 401 {message,error,statusCode} message="Missing token"
```

Order detail keys of the live order: `payment_method, id, patient_account_id, status, items, delivery_address, patient_notes, fulfillment, payment_mode, prescription_attachments, totals, ..., allocations_detail, governed_state` (null). It confirms that `governed_state` is empty before an offer is selected (order-confirm routes by `status`: `ready_for_split` -> the offers screen).

What the screens do with them: the payment screen reads a refusal code of the capabilities call as a state (`selected_quote_required` -> "No pharmacy chosen yet" with a way to the offers; `booking_not_found` / `not_authorized` -> the generic "not available" state), and a 5xx or an offline answer as an error with a retry, never as "nothing to pay"; `txn_not_found` on the result screen would be an error with a retry (it only happens for an id the app never received); an empty answer of the gateway sync is "we could not confirm this payment" with a way out; a guest answer 403 on the order is the error state; the seeded patient has no address, so the checkout says "no valid address" and does not send.

## What could not be exercised

- **No accepted quote, no gateway.** Both seeded orders are before the offer selection and the local backend has no gateway key, so no quote could be accepted, no insurance decision recorded, no payment intent created, no hosted page opened and no payment verified as paid. The paid, pending, failed, cancelled, refunded, unknown and unreachable states, the co-pay and self-pay choices, the cancel of a rejected order and every mutation were covered with answers shaped like the backend (`pharmacy-order.service.ts` `governedView`, `payments.module.ts` capabilities / intent / verify) in jest (`src/__tests__/pharmacy/checkout-payment-screens.test.tsx`) and with marked TEST fixtures in the render tool (TEST data). The payment provider (Moyasar sandbox) was not touched; nothing was paid.
- No mutation was executed against the backend (money, order and insurance state).
- Native device behaviour (the system browser hand-over, the return to the app, `AppState` foreground checks, the alert sheet) was not run; the app was rendered through react-native-web and tested under jest-expo.

## Screens against the states

All money, insurance and payment states (payable, paid, refusals, no method, co-pay, self-pay, rejected, pending, failed, cancelled, unknown, unreachable) were checked with backend-shaped jest tests and TEST fixtures in the render tool (temporary renders, not committed); the empty/offline/error states of every screen were rendered with `--api empty|offline`.
