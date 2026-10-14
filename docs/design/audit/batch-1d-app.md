# Batch 1d, patient-app: element audit (checkout, payment, insurance, payment result; high effort)

Branch `wip-b1d-app`. Paths relative to `patient-app/`. Source: `API` (endpoint field) · `input` · `copy` (locale key, 6 languages) · `derived` (comparison/format of server values; never a new price). Status: OK = real data, wired, tested. Needs review (NR) = `needs-review/batch-1d-app.json` (20). Runtime: `runtime-batch-1d-app.md`. Util: `src/utils/pharmacyCheckout.ts`.

Money rules held: the amount due is capabilities `amount`; rows beside it are the quote snapshot's `subtotal`/`delivery_fee` and the insurance summary's `insurer_share`/`co_pay_amount`; nothing is added or rounded on the phone. "Paid" only from the order's `payment_status` or the transaction status `paid` (the address's `status`/`amount` are never read). Every mutation: sync guard + disabled control, key reused only after no answer, server codes mapped to translated sentences, no card data in the app (hosted https page).

## Hand-overs

| From | Item | Status |
|---|---|---|
| 1b | checkout dropped cart lines when a prescription was chosen; read `prescriptionUrl` from `useCart()` | fixed: both groups sent and listed, duplicates removed (id or name), `prescription_id` sent, dead read removed |
| 1c | what `/pharmacy/payment` treats as payable | fixed: server flags (`payment_status`, capabilities answer or refusal code); old screen needed `CO_PAY_PENDING` (never produced), offered to pay a paid order |
| 1c | order-confirm / history route to offers by `ORDER_BROADCASTING`/`OFFERS_READY` (never produced) | order-confirm fixed with `orderRoute()` (by `status` when `governed_state` is null; reads deep-link `id`); `order-history.tsx` is 1e's file: NR, must call `orderRoute` |
| 1b | rx-order -> checkout vs web broadcast | aligned: same create+submit body fields as the web; NR on attachment form |

## `/pharmacy/checkout` (calls: GET `/prescriptions/:id`, `/users/me/addresses`; POST `/patient/pharmacy/orders`, `.../:id/submit`)

| Element | Source | Status |
|---|---|---|
| Header, back | copy | OK |
| Address card + "Change the location" | `resolveEffectiveAddress` (label, street, city, lat/lng) | OK; no map point blocks send with a notice |
| Delivery / Pickup | input -> `fulfillment` | OK |
| Prescription group + qty note | `/prescriptions/:id` `items[].name`; qty 1 (API sends none: NR) | OK |
| Cart group + qty | local cart minus prescription duplicates | OK |
| "No price / payment / points sent" | copy | OK (old "5 % points" sentence removed: unverifiable) |
| Send button | create then submit, key pair per body; clears the staged cart on success; -> broadcast-status | OK, single-flight, tested |
| Error notices (no point, sign in, items, offline, in progress, generic) | `checkoutErrorKey` | OK, never raw text |
| Loading / rx error / offline / empty states | board state components | OK |
| Insurance toggle, note field, payment methods | not drawn (coverage is chosen at offer selection; notes not shown to pharmacies) | NR |

## `/pharmacy/payment` (GET order, GET capabilities, POST `/payments/intent/pharmacy/:id`)

| Element | Source | Status |
|---|---|---|
| Order card (#last6, delivery address / pickup) | `id`, `fulfillment`, `delivery_address` | OK (pharmacy name, arrival time: no data, NR) |
| Rows Items / Delivery | snapshot `totals.subtotal`, `delivery_fee` (>0) | OK |
| Co-pay card, "Insurance covers" | `insurance_decision.patient_acceptance`, summary `insurer_share` | OK |
| "Total due now", Pay button | capabilities `amount`, `currency` | OK |
| Pay | intent `{}` + key; opens https `checkout_url` only; -> `/payments/result {transactionId}` | OK, single-flight, tested |
| Error notice (+ "Check payment status" if the transaction exists) | `payErrorKey` | OK |
| Paid / covered / COD / cancelled | `payment_status`, `governed_state` | OK |
| Blocked (accept price first, insurance step, no pharmacy, other) | capabilities refusal codes | OK |
| No method open, load error, offline | capabilities `methods`; outcomes | OK |
| Method list, points row, tax row | not drawn: intent ignores the method, no data | NR |

## `/pharmacy/insurance-decision` (GET order; POST `.../insurance/co-pay|self-pay/accept`, `.../insurance-rejection/cancel`)

| Element | Source | Status |
|---|---|---|
| Decision card + chip | `insurance_decision_summary.decision` | OK |
| Rows total / insurer covers / your co-pay | snapshot `totals.total`, `insurer_share`, `co_pay_amount` | OK |
| Per-item decisions | `insurance_item_decisions[]` + `items[].raw_name` | OK |
| Co-pay / self-pay option cards, "Confirm and continue" | summary `co_pay_amount`; snapshot `totals.total`; accept `{}` + key -> payment | OK, one confirm, single-flight, tested |
| Cancel order (rejected only) | confirm dialog, then cancel with key in body and header | OK |
| Accepted -> "Continue to payment" | `patient_acceptance.kind` | OK |
| Reviewing (pull / 20 s poll), covered, paid, cancelled, not insurance | `governed_state`, `payment_status`, decision | OK |
| Notice, load error, offline | `insuranceErrorKey`; "already recorded" re-reads | OK |

Old screen could not load for any decided order (it asked payment capabilities, which refuse before acceptance).

## `/payments/result` (POST `/payments/verify/:txn`, or GET `/moyasar/payments/sync/:id` for the gateway's `pay_` id)

| Element | Source | Status |
|---|---|---|
| Checking / still pending (+ "Check again") | pending answer; 3 s x 15, and on app foreground | OK |
| Paid + amount, reference, date | status `paid`; `amount`, `currency`, `paid_at`, `id` | OK; no `status` or `amount` from the address (tested) |
| Failed / cancelled / refunded | status; "Try again" -> payment screen (pharmacy) or back | OK, server text never shown |
| Cannot confirm (no id / no record), cannot check (unreachable) | empty answer; repeated failure | OK, way out + retry |
| Hosted page handed over by other services (`paymentUrl`) | opened once, https only | OK; WebView replaced by system browser (NR) |
| `/payments/success|failed|processing` | redirects forward params and add `?status=`, ignored | verified |
| Share receipt, service name, cart clearing | dropped (client-made text is not a receipt) | NR |

## `/pharmacy/order-confirm`: entry from a link/notification: reads the order, `router.replace(orderRoute(...))`; loading / offline / error with retry. BookingConfirm has no pharmacy equivalent here (NR).

## Colours, translation, tests

Raw colours in touched files 0; baselines: `no-raw-color` 7792 -> 7742, `client-token-sync` 916 -> 897, `no-left-right` 485 -> 481, `no-literal-ui-string` 5740 -> 5657 (0 in touched files), `locale-parity` 667 known, no new; 112 new keys x 6 languages. Mock scan: 0 hits. Tests: `pharmacyCheckout.test.ts` (19), `__tests__/pharmacy/checkout-payment-screens.test.tsx` (28), `pharmacy-draft.test.ts` (+1); no old test changed.
