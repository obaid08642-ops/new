# Batch 1d (web): checkout, payment, insurance decision, payment result, order router

Board: `CheckoutV2` (layout of the request step, the payment step and the insurance decision) with `States` for every empty / error / waiting state. `BookingConfirm` (listed for `/pharmacy/order-confirm`) is the doctor-booking summary: the pharmacy order has no confirmation page, so that route stays a router. HIGH effort: amounts, fees, insurance share and payment status come only from the backend; every mutation is single-flight with a stable idempotency key; no card data in the web code (the provider's hosted page takes it); success only when the backend says paid. Paths relative to `patient-web/`. Status: **ok** = built and checked, **not drawn** = no data from the server.

## Routes and elements

### `/cart/checkout` (`components-next/pharmacy-checkout/checkout-screen.tsx`)
| Element | Source | Status |
|---|---|---|
| Items, "x N", "Needs a prescription" | browser cart (`name`, `qty`, `rx`); no price, no total | ok |
| Prescription notice / "Upload" | `GET /prescriptions/active` (first UUID id) | ok; blocks sending when missing |
| Delivery / pick up (Segmented) | user input -> `fulfillment` | ok |
| Address card | `GET /users/me/addresses` (1b hook), needs lat/lng | ok; blocks sending when none |
| Direct / insurance (Segmented) | user input -> `payment_mode` | ok |
| Insurance card (company, class) | `GET /insurance/my-policy`; no number or id drawn or sent | ok |
| Summary (items count, delivery and price "set by the offer") | count of cart quantities; static copy | ok (no amount exists yet) |
| Send request button | `POST /patient/pharmacy/orders` + `/submit` through the patient proxy; `createBroadcastAttempt` (one at a time, same key until answered, new key after a 4xx or success) | ok; then `/pharmacy/broadcast-status` |
| Error line | signed out / 403 / no answer or 5xx / refused | ok |
| `?prescriptionId=` | redirect to `/pharmacy/rx-order`; malformed = 404 | ok |

### `/pharmacy/payment` (`payment-screen.tsx`, `pay-screen.tsx`)
| Element | Source | Status |
|---|---|---|
| Delivery card | order `delivery_address` | ok |
| Insurance card | order `coverage_mode` | ok |
| Method rows | capabilities `methods` (known ids only) | ok |
| Items / delivery / total price / covered by insurance | accepted snapshot `totals`, insurance summary `insurer_share` | ok, each only when sent |
| To pay now / Pay {amount} | capabilities `amount` | ok, never computed |
| Pay button | `POST /api/payments/pharmacy/:id/intent` (bounded BFF); https `checkoutUrl` named with its transaction; stores `{orderId, transactionId}` pointer in `sessionStorage` | ok; single-flight; Back-button restore handled |
| States: paid, covered, cash on delivery, closed, moving, no price, accept price first, insurance first, unavailable (no methods / refused / error) | order `payment_status`, `governed_state`, `status`, capabilities refusal code | ok |
| Points discount, tax, pharmacy name, arrival time | no field | not drawn |

### `/pharmacy/insurance-decision` (`insurance-screen.tsx`, `pharmacy-offers/insurance-decision.tsx`)
| Element | Source | Status |
|---|---|---|
| Per-item decision, covered, share, total share | `insurance_decision_summary`, `insurance_item_decisions` | ok |
| Accept and pay my share | only `APPROVED_PARTIAL` with share > 0 -> `POST .../insurance/co-pay/accept {}` | ok; goes to payment |
| Pay the full price myself | partial or rejected -> `POST .../insurance/self-pay/accept {}` | ok |
| Cancel the order (+ confirmation) | rejected only -> `POST .../insurance-rejection/cancel` (new allowlist entry) | ok |
| Processing + live check (15 s) | governed `INSURANCE_PROCESSING` | ok |
| "Decision recorded" + continue | capabilities answer OK (the backend refuses it until accepted) | ok |
| Covered in full / paid / no insurance step | `payment_status`, state | ok |

### `/payments/result` (+ `/payments/success|failed|processing` redirects, `/payments` -> `/cart/checkout`)
| Element | Source | Status |
|---|---|---|
| Success | only order `payment_status === "paid"` or verified transaction `paid`; never the address | ok |
| Processing, still waiting (15 checks), failed, refunded, order closed, unknown payment, could not be checked | order read, `POST /api/payments/verify/:txn` (new bounded BFF), pointer | ok |
| Reference | `?ref` / `?id`, text only | ok |
| Redirects | keep `ref`, `id`, `orderId`; drop the status word | ok |

### `/pharmacy/order-confirm`
Router (`lib/pharmacy/order-route.ts`) by the states the backend produces: no governed state -> `draft` waiting / broadcasting statuses -> offers; `OFFER_SELECTED|FINAL_QUOTE_READY` -> final price; `FINAL_QUOTE_ACCEPTED` -> payment; `INSURANCE_*` -> insurance decision; paid, COD, fulfilment -> tracking. No id: board empty state; unreadable: error state with retry.

## Other changes
- `app/api/payments/verify/[txn]/route.ts` (new, returns only id, status, booking kind and id); `app/api/patient/pharmacy/orders/route.ts` deleted (any-cookie handler, no session refresh; no caller left); allowlist: rejected-insurance cancel.
- 1c code touched: `payment-actions.tsx` (insurance accept no longer waits for capabilities; online payment uses the bounded intent route and leaves the pointer; `RejectedInsuranceCancel`), `insurance-decision.tsx` extracted from `offers-screen.tsx` (co-pay only for a partial decision; covered total row), `use-pharmacy-action.ts` (payment refusal codes, `alreadyPaid`).
- Deleted: `checkout-flow.*`, `client-checkout-section.tsx`, `pharmacy-payment-client.tsx`, `pharmacy-insurance-decision-client.tsx`, `cart/cart.module.css`, `payments/result/payment-result.module.css`, `cart/checkout/pharmacy-broadcast-submit.tsx`.

## Mock / placeholder found
`mock-scan` over the routes and `components-next/pharmacy-checkout/`: 0 hits. Removed from the old files: "delivered within 30 minutes", an invented plan-tier co-pay table, a fixed city list, a fake "order confirmed" card, a "Premium Care" strapline, raw hex colours and inline `style=`.

## Defects found and fixed (client side)
1. The insurance decision could not be accepted: buttons waited for capabilities the backend refuses until acceptance (same in patient-app).
2. The result page trusted `?status=`; success needed a backend route that does not exist.
3. Policy number and national id were put into `patient_notes`; "delivered within 30 minutes" claimed.
4. Two carts, two submit buttons; `?prescriptionId=` ignored; a new idempotency key on every press.
5. The order router waited for states the server never sends (`OFFERS_READY`, `ORDER_BROADCASTING`).
6. 1c: a co-pay button for a rejected decision.
