# Batch 1d (web): checkout, payment, insurance decision, payment result, order router. Element audit

Slice 1d of Batch 1, patient-web, rebuilt from `canvas/CheckoutV2` (payment: direct or insurance; its layout is used for the request step, the payment step and the insurance decision) with `canvas/States` for every empty / error / waiting state. `canvas/BookingConfirm` is the board `screens.json` lists for `/pharmacy/order-confirm`: it is a doctor-booking summary, and the pharmacy order has no confirmation page of its own (see R5), so that route stays a router and draws nothing of the board. HIGH effort: money, payment status and insurance. Written from the code on branch `wip-b1d-web`. Paths are relative to `patient-web/` unless they start with `backend/`. Routes are `/{locale}/…` (ar, en, ur, hi, bn, fil).

Routes: `/cart/checkout`, `/pharmacy/payment?orderId=`, `/pharmacy/insurance-decision?orderId=`, `/payments/result` (and the `/payments`, `/payments/success`, `/payments/failed`, `/payments/processing` redirects), `/pharmacy/order-confirm?orderId=`.

How to read: **Source** is `API <METHOD> <path> field`, `user input`, `browser cart`, `static copy (messages key)` or `computed`; **Goes to** is a route, an endpoint or `none (display only)`. `[when …]` is the condition under which the element is drawn: **an element whose data the server did not send is not drawn**. Strings are keys of `PharmacyCheckout`, `Payments`, `PharmacyOffers` or `PharmacyAddress` in `messages/{ar,en,ur,hi,bn,fil}.json`.

## The rules this slice is held to (HIGH effort)

- **Amounts, fees, totals, discounts, insurance share and payment status come only from the backend.** The payment screen draws `GET /payments/pharmacy/:id/capabilities` `amount` (the sum to collect) and the accepted quote snapshot's `totals.subtotal / delivery_fee / total` and the insurance summary's `insurer_share`; each only when sent. Nothing is added, subtracted, multiplied or rounded in the browser: `lib/pharmacy/payment-state.ts` only reads and branches. The checkout (the step before a price exists) draws **no amount at all** (the browser cart's catalogue prices are not summed there; `/cart` keeps its labelled estimate from 1b).
- **A payment is "paid" only when the backend says so.** `/payments/result` asks the backend: first `GET /patient/pharmacy/orders/:id` (`payment_status === "paid"` is set by the backend only after it verified the payment), then `POST /payments/verify/:txn` through a new bounded route (the backend asks the provider and records the answer). The address (`?status=paid`, `?id=`) is never read for a status. Every other answer is drawn as what it is: still pending (polling, then "still waiting"), failed, refunded, order closed, unknown payment, or unreachable.
- **Every mutation is single-flight with a stable idempotency key.** Send request (`createBroadcastAttempt`: one send at a time, same key until the server has answered, a new key after a 4xx refusal or a success), start payment, accept or self-pay an insurance decision, cancel a rejected order (all through `usePharmacyAction`: a runner flag plus a disabled, loading button; the key is kept when the outcome is unknown, dropped after a server answer). Server refusals are mapped to translated sentences by their backend code.
- **No card data anywhere in the web code.** The pay button asks the server for a payment; the patient enters the card on the provider's hosted page (`checkout_url`, https only, named together with its transaction). Nothing the patient types on these screens is a card number or CVV; nothing is logged, stored or put in a URL. The only thing kept is a pointer (order id and transaction id) in this tab's `sessionStorage`, so the result screen can ask the backend about the right payment when the provider sends the patient back with its own id only.
- Money through `Intl` (`formatMoney` / `formatPrice`), no `zod` in any client bundle, no raw colours, no inline styles, 44 px targets, accessible names, `prefers-reduced-motion` respected (the shared Spinner/states).

## F1. Shared frame

`components-next/core/core-shell.tsx` (the Batch 0 shell): phone header with back button and title, wide top bar, tab bar (hidden on the checkout and payment screens, which carry a sticky action bar as the board does). All routes are private: `requirePatientAccess` (signed out goes to the sign-in), 401 from the backend goes to the sign-in, 403 / 404 is the not-found page, any other failure is the board's `ErrorState` with retry.

## R1. `/cart/checkout`: send the cart as a request (`components-next/pharmacy-checkout/checkout-screen.tsx`)

The route (server) asks for a session, redirects `?prescriptionId=` to `/pharmacy/rx-order?prescriptionId=` (the screen that orders a prescription; a malformed id is a 404), and renders the screen. **It no longer reads `GET /cart/checkout`**: the checkout sends the browser cart (the one the product pages fill and `/cart` shows); the server cart has no writer on web or in the app (Needs review 1).

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R1.1 | Phone header: back, "Checkout"; h1 from 768 | button, text | static copy (`title`) | back: `/{locale}/cart` |
| R1.2 | Skeleton | block | static copy `[until the browser cart is read]` | none |
| R1.3 | Empty state (board "States"), "Browse medicines", "Open the cart" | block | static copy `[cart read and empty]` | `/c`, `/cart` |
| R1.4 | Request card: storefront tile (FIcon, pharmacy tone), "Your request", lead | card | static copy | none |
| R1.5 | Item rows: name, "× N" | list | browser cart `name`, `qty` (name drawn as text, `dir="auto"`) | none |
| R1.6 | "Needs a prescription" chip | chip | browser cart `rx` `[when true]` | none |
| R1.7 | Prescription notice: checking / attached / missing (banner with "Upload") / read failed | status, link | `GET /prescriptions/active` through the BFF `[when the cart has a prescription item]`; first active prescription with a UUID id | `/pharmacy/scan-prescription` |
| R1.8 | "How do you want to receive it?" delivery / pick up | segmented (board Segmented) | user input | `fulfillment` of the draft |
| R1.9 | Address card ("Deliver to", "Change" / "Manage addresses") | card | `GET /users/me/addresses` through `useDeliveryAddress` (1b): default address with a location, else the first with one; no address or no location says so and blocks sending | `/profile/addresses` |
| R1.10 | "How will you pay?" direct / insurance | segmented | user input | `payment_mode` of the draft (`cash` / `insurance`) |
| R1.11 | Insurance card: company, "Class: X", "The pharmacy asks your insurer for approval, and you pay only your share." | card | `GET /insurance/my-policy` `company_name` / `provider`, `plan_class` `[when insurance is chosen and a policy exists]`. The policy number, member id and national id are **not** read or drawn | none |
| R1.12 | "No insurance policy saved" + "Add a policy" | card, link | `has_policy: false` `[when insurance is chosen]` (sending is blocked) | `/insurance/add-policy` |
| R1.13 | "You confirm how you pay when you choose an offer." | text | static copy (the real coverage choice is made at selection, 1c) | none |
| R1.14 | Summary: Items (count), Delivery "Set by the pharmacy's offer", Final price "Shown with each offer" | rows | `computed` count of the cart's quantities; the other two are static copy: no amount exists yet | none |
| R1.15 | "Nothing is charged when you send the request." | text | static copy | none |
| R1.16 | **"Send request to pharmacies"** (sticky bar on phones, inline from 1024) | button | user action; disabled until the cart, the address, the prescription (if needed) and the insurance (if chosen) are ready; spinner while sending | `POST /patient/pharmacy/orders` then `POST …/:id/submit` (through the patient proxy: session refresh, allowlist, idempotency key `k` and `k-submit`); body: items `{raw_name, qty, sku, intake_source:"cart"}`, `delivery_address`, `fulfillment`, `payment_mode`, `prescription_id` + `prescription_attachments`; success clears the cart and goes to `/pharmacy/broadcast-status?orderId=` |
| R1.17 | Error under the button | status | the real failure: signed out (+ sign-in link), 403 (account cannot send), no answer (the request is not sent twice), any other refusal. Never a made-up sentence | none |

Removed from the old screen (all were defects, see "Defects fixed"): the free-text name / phone / city / district / street fields, the hard-coded city list, the policy-number and national-id fields (they were put into `patient_notes`), the plan-tier list with invented co-pay percentages, "Delivered within 30 minutes", the inline "order confirmed, being prepared" card.

## R2. `/pharmacy/payment`: pay for an order whose price was accepted (`payment-screen.tsx`, `pay-screen.tsx`)

Server reads: `GET /patient/pharmacy/orders/:id` and, only at a step where something can be due (`FINAL_QUOTE_ACCEPTED`, `INSURANCE_DECISION_READY`), `GET /payments/pharmacy/:id/capabilities`. `paymentPageState` (pure, tested) picks the screen.

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R2.1 | Delivery card ("Deliver to" + the order's address) | card | order `delivery_address` label / street / district / city `[when sent]` | none |
| R2.2 | Insurance card "Through insurance: your insurer covers its part. You pay only your share." | card | order `coverage_mode === "insurance"` | none |
| R2.3 | Payment method rows (board Radio) | radiogroup | capabilities `methods[].id` (`card`, `apple-pay`, `google-pay`; unknown ids dropped); first is selected | the `method` of the payment call |
| R2.4 | Amount rows: Items, Delivery (cash) / Total price, Covered by insurance (insurance) | rows | accepted quote snapshot `totals.subtotal`, `totals.delivery_fee`, `totals.total`; insurance summary `insurer_share` `[each when sent]` | none |
| R2.5 | "To pay now" / "Your share, to pay now" | number | capabilities `amount` (the server's sum), `currency`, Intl | none |
| R2.6 | **"Pay {amount}"** (sticky bar on phones, inline from 1024) | button | user action; single-flight | `POST /api/payments/pharmacy/:id/intent` `{method}` (bounded BFF: only transaction id, status, amount, currency and `checkoutUrl` come back); on an `https` `checkoutUrl` named together with its transaction the browser goes there and the pointer `{orderId, transactionId}` is stored; otherwise "not available on the web yet" and nothing is claimed |
| R2.7 | "You enter your card details on the payment provider's secure page. Nabd Plus never sees or stores them." | text | static copy | none |
| R2.8 | Error line | status | the server's code: `booking_already_paid` (and the page re-reads, so it then shows "Payment confirmed"), `payment_order_not_collectable`, `final_quote_acceptance_required`, signed out, forbidden, network (also gateway 502 / 503), generic | none |
| R2.9 | State screens (board "States"): paid, covered by insurance, cash on delivery, closed (cancelled / expired), already moving, no price yet, accept the final price first, insurance decision first | block, link | order `payment_status`, `governed_state`, `status`, and the capabilities' refusal code | track the order / my orders / the offers / `/pharmacy/final-quote` / `/pharmacy/insurance-decision` |
| R2.10 | Unavailable: no method open, the server refused, could not be loaded | error state | capabilities with an empty `methods`, a 4xx with an unknown code, a 5xx | retry (`router.refresh()`), "Order status" |

Points discount ("خصم النقاط") and the tax row of the board are not drawn: the backend has no points redemption and states no tax (Needs review 4). The pharmacy name and the arrival time of the board's top card are not drawn: the order carries no pharmacy name before fulfilment and the server's estimate is a constant (1c Needs review).

## R3. `/pharmacy/insurance-decision` (`insurance-screen.tsx`, `pharmacy-offers/insurance-decision.tsx`)

Server read: `GET /patient/pharmacy/orders/:id` (+ capabilities once the decision is ready, to learn whether it was already accepted: the backend refuses capabilities until a decision is accepted and answers after).

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R3.1 | "The insurer is reviewing" + live check strip (15 s, "Refresh now") | notice, status | governed `INSURANCE_PROCESSING` | `router.refresh()` |
| R3.2 | Decision label, one row per item (name from the order's items, covered, your share, reason), total share | list | order `insurance_decision_summary`, `insurance_item_decisions[]` | none |
| R3.3 | **"Accept and pay my share"** | button | only for `APPROVED_PARTIAL` with a share above zero (the backend's rule: `copay_acceptance_requires_partial_decision`) | `POST /patient/pharmacy/orders/:id/insurance/co-pay/accept` `{}` then `/pharmacy/payment` |
| R3.4 | **"Pay the full price myself"** | button | `APPROVED_PARTIAL` or `REJECTED` | `POST …/insurance/self-pay/accept` `{}` then `/pharmacy/payment` |
| R3.5 | **"Cancel the order"** + confirmation | button | `REJECTED` only | `POST …/insurance-rejection/cancel` `{}` (new allowlist entry, backend `cancelRejectedByPatient`), then `/pharmacy` |
| R3.6 | "Your decision is recorded" + "Continue to payment" | notice, link | the capabilities answer is OK (acceptance recorded) | `/pharmacy/payment` |
| R3.7 | "Insurance covers this order in full" + "Track the order"; "already paid" | notice, link | `payment_status` `covered_by_insurance` / `paid` | tracking |
| R3.8 | No insurance step | empty state | any other state | order status |

## R4. `/payments/result` and its redirects (`payment-result.tsx`)

The route reads only references from the address: `?ref=` (our transaction), `?id=` (the provider's payment id, drawn as text), `?orderId=`; `?status=` is ignored. The screen polls every 3 s, at most 15 times, then says "still waiting"; "Check again" restarts.

| # | Element | Kind | Source | Goes to |
|---|---|---|---|---|
| R4.1 | Checking state | status | static copy | none |
| R4.2 | **Payment successful** (check-circle) | state | **only** order `payment_status === "paid"` or a verified transaction `status === "paid"` | "Track the order" (order known) / "My orders" |
| R4.3 | Processing | state | transaction `pending` / `initiating` / `authorized` / an unknown status, or an order with no transaction yet | "Check again", "My orders" |
| R4.4 | Still waiting for the provider | state | 15 checks with no final answer | "Check again", "My orders" |
| R4.5 | Payment failed | state | transaction `failed` / `cancelled` | "Try again" (`/pharmacy/payment?orderId=`) / "My orders" |
| R4.6 | Refunded | state | transaction `refunded` / `partially_refunded` | My orders |
| R4.7 | Order closed | state | order `cancelled` / `expired`, nothing paid | My orders |
| R4.8 | Unknown payment | state | no order id and no transaction id from the address or the pointer | My orders |
| R4.9 | Result could not be checked | error state | the backend could not be reached on the last check | "Check again", "My orders" |
| R4.10 | Reference | text | `?ref` or `?id` (letters, digits, `_`, `-`; drawn LTR, as text) | none |

Redirects: `/payments` goes to `/cart/checkout` (page and `next.config.ts`); `/payments/success`, `/failed`, `/processing` go to `/payments/result` carrying `ref`, `id`, `orderId` and **not** the status word they stand for.

## R5. `/pharmacy/order-confirm` (router)

`routeForOrder` (pure, tested) from the states the backend produces: paid → tracking; `OFFER_SELECTED` / `FINAL_QUOTE_READY` → `/pharmacy/final-quote`; `FINAL_QUOTE_ACCEPTED` → `/pharmacy/payment`; `INSURANCE_*` → `/pharmacy/insurance-decision`; `COD_REGISTERED` and fulfilment states → tracking; no governed state: `draft` → `/pharmacy/waiting-for-pharmacy`, `broadcasting` … `offer_selection_pending` → `/pharmacy/broadcast-status`. (`OFFERS_READY` and `ORDER_BROADCASTING` are not states the server sends.) A missing or malformed id is the board's empty state ("No order was named", My orders, Browse); an unreadable order is the error state with retry.

## BFF and library changes

| File | Change |
|---|---|
| `app/api/payments/verify/[txn]/route.ts` (new) | `POST` to the backend's `/payments/verify/:txn` with the server-held token; returns only `transactionId`, `status`, `bookingKind`, `bookingId` (the backend's transaction document also holds `client_secret`, `webhook_payload`); same-origin check; bounded errors |
| `app/api/patient/pharmacy/orders/route.ts` (deleted) | the any-cookie handler (it forwarded the refresh token or the device id as a bearer token and could not refresh a session); its only callers are gone: sending now goes through the patient proxy |
| `lib/api/patient-allowlist.ts` | `POST /patient/pharmacy/orders/:id/insurance-rejection/cancel` |
| `lib/pharmacy/broadcast.ts` | `cart` request kind; `createBroadcastAttempt` |
| `lib/pharmacy/payment-state.ts`, `payment-return.ts`, `order-route.ts`, `checkout-support.ts` (new) | pure readers, no zod |
| `components-next/pharmacy-offers/payment-actions.tsx` | accepting an insurance decision no longer asks for payment capabilities first (see defect 1) and goes on to the payment step; online payment uses the bounded intent route and remembers the pointer; `RejectedInsuranceCancel` |
| `components-next/pharmacy-offers/insurance-decision.tsx` | the decision block, moved out of `offers-screen.tsx` and shared by both pages; the co-pay button follows the backend rule |

## Mock / placeholder found

`node tools/design/mock-scan.mjs` over the routes and `components-next/pharmacy-checkout/`: 0 hits. The old files had: a fixed "Nabd Pharmacy, Premium Care" strapline, raw hex colours and inline `style=` on every page, an Arabic / English-only copy table, "Delivered within 30 minutes", an invented plan-tier co-pay table (20 % up to 50 / 75 / 100 SAR), a hard-coded city list and a fake order-confirmed card.

## Defects found in the old screens and fixed here (client side)

1. **The insurance decision could not be accepted.** The accept buttons were drawn only after the payment capabilities loaded, and the backend refuses the capabilities (`copay_acceptance_required`, `insurance_rejected_acceptance_required`) until the decision is accepted. Acceptance needs no payment method (the backend only reads `kind`), so the buttons are drawn from the decision itself and the method is chosen on the payment step. (The old payment client and the app's screen have the same dependency; Needs review 6.)
2. **The result page trusted the address.** It showed processing for any unknown payment and failed for `?status=failed`; success needed a backend route that does not exist (`GET /payments/status/:ref`). It now asks the backend by order and transaction.
3. The old checkout put the policy number and national id into the free-text `patient_notes` (`insurance:…|policy:…|nid:…`) and claimed "delivered within 30 minutes" and "your order is being prepared" right after sending.
4. Two carts and two submit buttons: the server cart's totals and a second "send request" for its lines next to the browser-cart form.
5. `?prescriptionId=` was ignored (an order from a prescription ended in "cart is empty").
6. A new idempotency key on every press of "accept" (`Date.now()`), a browser `Retry` that rebuilt the key, `toFixed(2)` money, text only in two languages, `window.location.href` to any `https` address without remembering the payment.
7. The order-confirm router waited for governed states the server never sends (`OFFERS_READY`, `ORDER_BROADCASTING`), so a broadcasting order landed on tracking.
8. Raw colours and inline styles on every page (CSP), `lucide-react` icons outside the design set.
9. The offers page showed a co-pay button for a rejected decision with a share above zero (the backend refuses a co-pay unless the decision is partial).

## Deviations from the board and data not drawn

- Board "pharmacy name · arrives in [time] · to [address]": the pharmacy name is not on the order before fulfilment and the arrival time is a server constant; the delivery address is drawn on the payment screen.
- Board "points discount" and "tax: inclusive": no field (Needs review 4).
- Board payment-method logos (`[شعار]`): no logo assets exist; the method name is drawn in the board's Radio row.
- Board segmented "direct / insurance" on the payment screen: coverage was decided at offer selection (1c), so it is stated, not offered; the segmented choice is on the checkout (draft `payment_mode`).
- The Success board (celebration, lime on ink) is not used: its colours are outside the base palette and its text claims delivery times and points the backend does not send.
