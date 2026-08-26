# Patient Mobile: Consultation booking core — manual semantic review

## Scope

تمت قراءة الملفات التالية كاملة من baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`:

| Surface | Source | Lines |
|---|---|---:|
| select doctor, visit type and slot | `app/consultations/book/[id].tsx` | 1–386 |
| confirm, cash/card/insurance choice | `app/consultations/booking-confirm.tsx` | 1–473 |
| interim provider acceptance | `app/consultations/booking-pending.tsx` | 1–216 |
| post-create success | `app/consultations/booking-success.tsx` | 1–363 |
| appointment detail and downstream CTA | `app/consultations/appointment-detail.tsx` | 1–278 |
| cancellation and reschedule | `app/consultations/cancel-reschedule.tsx` | 1–326 |

The review treats Mobile as an implementation to be audited, not as the normative product. The owner-approved contract is: choose service/provider/slot; Cash/Card must complete the applicable payment step before confirmation; insurance request has no payment, then provider/insurer decision and co-pay, then patient payment, then confirmation.

## Confirmed defects and contract gaps

| ID | Evidence | Finding | Required closure |
|---|---|---|---|
| PM-CONS-001 | `book/[id].tsx:95–120, 150–174` | Slot is read and transported in route params but the UI has no displayed hold/expiry/quote version; it becomes stale before creation | server creates/holds a slot atomically with expiry and returns a booking/quote token; UI must display/recover from hold expiry |
| PM-CONS-002 | `booking-confirm.tsx:278–331` | Confirmation re-offers all three visit types after the selected doctor/slot was chosen, including modes the doctor may not support; slot compatibility is not reloaded when mode changes | lock chosen capability/slot or reload valid slots and quote for any mode change |
| PM-CONS-003 | `booking-confirm.tsx:144–161, 390–424` | VAT, total, insurance covered amount and co-pay are calculated/displayed in the client from provider profile and preliminary coverage data | authoritative server quote with currency/tax/discount/payment state; client must render, not calculate, payable amounts |
| PM-CONS-004 | `booking-confirm.tsx:163–198, 204–225` | appointment is created before card intent, with no idempotency shown on appointment creation; payment intent has a separate key and no demonstrated atomic pending-payment/slot-hold contract | single idempotent booking-payment initiation transition; failed/abandoned/replayed intent must not create duplicate or confirmed bookings |
| PM-CONS-005 | `booking-confirm.tsx:235–249` | cash branch routes to success immediately after appointment creation, without a demonstrated cash collection/payment authorization before confirmation | explicit consultation cash policy and server state; if cash is permitted, record collection owner/time and do not render confirmed before the authoritative state says so |
| PM-CONS-006 | `booking-confirm.tsx:110–142, 152–160, 226–234, 334–388, 445–452` | insurance coverage check is preliminary and not booking/slot/provider-decision bound; selected `insCategory` is never sent, logged-in user with no policy can still proceed, and provider/insurer decision is not the source of final co-pay | insurance request must capture owned policy/network, service/slot/quote, then wait for authoritative full/partial/reject/co-pay decision and payment before confirmed state |
| PM-CONS-007 | `booking-confirm.tsx:114–126` | insurance request implementation manually reads bearer token and composes a mutable API base with localhost fallback; this is an inconsistent sensitive request path outside `apiFetch` | one authenticated mobile transport and environment policy, no uncontrolled fallback; enforce ownership on all insurance reads/mutations |
| PM-CONS-008 | `booking-success.tsx:98–112, 161–245` | success UI says booking confirmed and renders a fixed date/time and fixed doctor name (`Tuesday 24 May, 10:30`, `Dr Mohamed Ahmed Al-Kurdi`) instead of appointment data | remove static success data; obtain appointment from server and render `PENDING_PAYMENT`, `PENDING_PROVIDER`, `PENDING_INSURANCE`, or `CONFIRMED` truthfully |
| PM-CONS-009 | `booking-success.tsx:52–66` | routing depends on URL params and `isToday`, not fetched booking state; insurance route merely returns to consultations rather than owned insurance decision state | derive every next step from authorized booking state and exact insurance request ID |
| PM-CONS-010 | `booking-pending.tsx:97–118, 121–143, 168–187` | generic copy promises 100%/3–5-day refund, acceptance timing and provider decline result without a server refund quote/ledger state | server returns cancellation eligibility, policy/version, refund amount/method/status and provider-decision expiration; UI must render that response |
| PM-CONS-011 | `cancel-reschedule.tsx:84–88, 100–125, 178–189, 221–228` | refund percentage is independently computed in the client and repeated in policy text, while cancel only sends a reason; reschedule has no idempotency/hold token or price/insurance consequence display | authoritative cancellation/refund quote and idempotent cancel; reschedule must lock slot and reprice/revalidate payment/insurance before result |
| PM-CONS-012 | `appointment-detail.tsx:53–80, 171–235` | detail shows a hard-coded `Confirmed` banner regardless of actual status; default date/time and duration are invented; cancel/join/location/tracking CTAs can render without state gating | status-specific presentation and CTAs only for allowed server states, including co-pay/payer/payment and appointment ownership checks |
| PM-CONS-013 | `appointment-detail.tsx:171–196` | co-pay modal finds request by scanning `/insurance/requests/my`; it does not receive an immutable request relation/amount/version directly from appointment | appointment must reference owned insurance request/decision; payment route receives verified request ID and server quote only |
| PM-CONS-014 | `book/[id].tsx:49–66, 258–315` | date window is local-device next seven days and does not establish provider timezone/holiday/slot expiry; available slot is merely disabled by response flag | server supplies date/timezone/availability/expiry and reschedule/booking clients handle time correctly |
| PM-CONS-015 | Across sources | status/type vocabulary is inconsistent (`service_type`, `consultation_type`, `online`, `video`, `CONFIRMED`, `PENDING_COPAY`), creating UI state-routing risk | one shared typed booking state contract; no `@ts-nocheck` for financial/state flows |

## Conclusion

The Mobile consultation flow has real-looking read and mutation shells, but it is not a closed trustworthy journey. It mixes local price/refund calculations, param-driven success routing and fixed success data with partial API calls. The confirmed design target must be a server-authoritative state machine linking slot hold, quote, payment intent/webhook or insurance decision/co-pay, provider acceptance, notification, cancellation/refund and the exact patient-visible result.
