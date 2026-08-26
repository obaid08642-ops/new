# Patient Mobile: Pharmacy cart, broadcast, offer and payment — manual semantic review

## Scope

تمت قراءة الملفات التالية كاملة من baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`:

| Surface | Source | Lines |
|---|---|---:|
| cart / Rx attach | `app/pharmacy/cart.tsx` | 1–263 |
| checkout / order request | `app/pharmacy/checkout.tsx` | 1–426 |
| waiting for pharmacy | `app/pharmacy/waiting-for-pharmacy.tsx` | 1–351 |
| single accepted basket | `app/pharmacy/order-confirm.tsx` | 1–220 |
| pharmacy payment | `app/pharmacy/payment.tsx` | 1–260 |
| alternate broadcast bids | `app/pharmacy/broadcast-status.tsx` | 1–104 |

The owner-approved pharmacy contract is controlling: patient cart → geographic broadcast → multiple pharmacy offers containing availability/substitution/price/ETA → patient chooses exactly one offer. Cash/Card occurs after offer selection. COD requires explicit deferred-collection policy. Insurance has no payment at selection, then pharmacy/insurer full/partial/reject/co-pay decision, then patient pays co-pay or consciously chooses an approved alternative/cancel, then preparation.

## Confirmed defects and missing closures

| ID | Evidence | Finding | Required closure |
|---|---|---|---|
| PM-PHARM-001 | `cart.tsx:29–66, 138–190` | Rx attachment is a local device URI stored as `prescriptionUrl`; no upload, malware/type validation, patient ownership, Rx identifier or pharmacist review state exists | secure owned prescription/document upload and verification state; only server document ID/token may enter order request |
| PM-PHARM-002 | `cart.tsx:99–129, 207–225` | price, quantity and subtotal are all client-cart values; UI calls the total estimated but passes client data onward | cart lines must use catalog identity/quantity only; server returns quote/source version and all true totals |
| PM-PHARM-003 | `checkout.tsx:70–79, 99–123, 125–176, 301–395` | patient selects Cash/Card/Insurance/Wallet and sees client delivery fee/discount/total before any pharmacy offer. `POST /orders/create` includes client name/price and no idempotency key is shown | request broadcast must precede offer selection and payment selection. Server owns price/stock/fees/coupons/points; idempotent request creation and quote/version are required |
| PM-PHARM-004 | `checkout.tsx:130–157` | client location is mandatory even for pickup and a local prescription URI is sent as `prescription_id`; insurance is only a profile-presence gate, not an owned benefit/request decision | service-mode-specific location policy; server document ID; insurer policy/network and decision request linked to the selected offer |
| PM-PHARM-005 | `waiting-for-pharmacy.tsx:90–121, 198–247` | normal checkout never routes to the dedicated bids UI. It polls order state and sends `ACCEPTED`, `PREPARING` or generic basket review directly to one confirmation surface; no offer list, expiry, rebroadcast, all-declined or substitution choice | one broadcast state machine with offer collection/status/expiry/cancel/rebroadcast and explicit patient offer-selection route |
| PM-PHARM-006 | `order-confirm.tsx:50–70, 110–196` | exactly one pharmacy/basket is shown. Missing-item copy permits automatic other-pharmacy selection/removal without patient-specific substitution/partial fulfillment consent. No offer ID/expiry/insurance decision is visible | ranked multiple offers with pharmacy identity, lines, alternatives, price/ETA and offer expiry; patient accepts one immutable offer and consents to any substitution/partial order |
| PM-PHARM-007 | `broadcast-status.tsx:21–53, 75–91` | alternate bids screen is closer to broadcast but shows only available-item count/total and accepts a bid straight to tracking, skipping payment and insurance branches | unify it with canonical offer selection; include detailed items/substitutions/ETA/price/payer state and route post-selection to the correct cash/card/insurance next state |
| PM-PHARM-008 | `payment.tsx:53–102, 175–240` | payment correctly reloads a server total, but an unapproved insurance order with default/zero co-pay can bypass the disabled condition and route to tracking because `amountToPay <= 0`; no insurance decision request relation is used | payment allowed only for a verified `COPAY_PENDING`/full-approval state with decision/version. Pending/rejected insurance must not prepare/track as confirmed |
| PM-PHARM-009 | `payment.tsx:64–81` | Cash/COD immediately clears cart and routes tracking with no explicit server collection policy/assignment/receipt state presented | server-recorded COD/deferred-collection state, eligibility/policy/collector and clear cancellation/refund behavior before tracking |
| PM-PHARM-010 | Across sources | client and route state do not consistently represent request, offer, selected offer, payment intent/webhook, insurance decision/co-pay, preparation and delivery states | shared typed pharmacy state machine and test matrix across Mobile, Web, Provider and Admin |

## Conclusion

Mobile contains two contradictory pharmacy flows: a one-pharmacy accepted basket path and an alternate bids path. Neither satisfies the approved multi-offer contract end-to-end. The underlying order request also accepts client-derived price/prescription/payment fields at the UI boundary. This is a high-priority shared product, financial and safety blocker for Mobile and Web; it must be rebuilt against a central backend/data contract before visual parity work.
