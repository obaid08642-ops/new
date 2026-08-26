# Patient Mobile: Pharmacy Rx, reorder, tracking and chat — manual semantic review

## Scope

| Surface | Source | Lines |
|---|---|---:|
| prescription-to-cart | `app/pharmacy/rx-order.tsx` | 1–129 |
| tracking | `app/pharmacy/order-tracking.tsx` | 1–252 |
| dedicated reorder | `app/pharmacy/reorder.tsx` | 1–160 |
| order history / alternate reorder | `app/pharmacy/order-history.tsx` | 1–339 |
| pharmacy chat / negotiation | `app/pharmacy/chat-with-pharmacist.tsx` | 1–550 |

## Confirmed defects and missing closures

| ID | Evidence | Finding | Required closure |
|---|---|---|---|
| PM-PHARM-RX-001 | `rx-order.tsx:22–30, 40–57` | all prescription medicines are copied into a local cart with client price/qty; this forces `insurance` without eligibility/decision and loses individual prescription instructions, refills, substitutions and expiry | one server prescription-to-order-request action that preserves Rx constraints and starts broadcast; payer must be chosen only by explicit, eligible policy |
| PM-PHARM-RX-002 | `rx-order.tsx:54–57` | `prescription_url` can be treated as a prescription reference and passed into generic cart state without typed proof | only an owned verified prescription ID/document token can be bound to a request; OCR/manual attachments remain `PENDING_REVIEW` |
| PM-PHARM-TRACK-001 | `order-tracking.tsx:28–50, 66–85` | local state mapping treats every unknown state as level zero but claims "confirmed successfully" and uses one `updated_at` time for all steps; cancelled/rejected/insurance pending/payment failed/COD collection are absent | authoritative event timeline and state-specific UI including all negative/payment/insurance/COD branches |
| PM-PHARM-TRACK-002 | `order-tracking.tsx:87–130` | missing pharmacy falls back to "pharmacy being assigned" while patient can open chat with no `orderId` parameter; ETA is not a timestamp/last update | exact order-scoped chat route, provider assignment state, server ETA/revision and error/retry behavior |
| PM-PHARM-REORDER-001 | `reorder.tsx:22–73, 126–145` | old price is displayed and locally totalled; errors are only logged; it claims prior address/payment are reused although UI does not confirm policy changes or insurance eligibility | server reorder quote/request with idempotency, current availability/Rx/payer/address consent and failure state; no old price shown as current |
| PM-PHARM-REORDER-002 | `order-history.tsx:48–109, 261–269` | history contains a second reorder implementation that copies delivered items and old prices directly to local cart, sets `rx:false`, and bypasses dedicated reorder API | remove duplicate path; preserve Rx and route through the controlled reorder request/broadcast flow |
| PM-PHARM-CHAT-001 | `chat-with-pharmacist.tsx:41–42, 82–103` | 15-minute negotiation expiry is a local countdown that appends an authoritative-sounding system message; no server expiry/event is applied | server offer/chat session expiry with read-only state, notification, audit and re-open policy |
| PM-PHARM-CHAT-002 | `chat-with-pharmacist.tsx:183–267` | invoice confirmation merely returns to cart. Accept substitutes, remove unavailable items and cancel order are alerts/local back navigation with no mutations | offer-line/substitution/partial/cancel actions bound to selected offer version, patient consent and idempotent backend transitions |
| PM-PHARM-CHAT-003 | `chat-with-pharmacist.tsx:137–181` | upload permits arbitrary image metadata and sends URL as chat content. Backend membership/virus/PHI access policy is not established from the mobile source | validated scoped upload, thread membership, retention/audit and malware/media policy; no trust in client MIME/name |

## Conclusion

Downstream Pharmacy paths reintroduce client-derived price/quantity/Rx state and duplicate re-order logic. Tracking hides failed states, and the chat presents the critical patient-consent controls for substitutions and cancellation as local UI only. These are confirmed product gaps that must be resolved with the core offer/state-machine rebuild, not patched individually.
