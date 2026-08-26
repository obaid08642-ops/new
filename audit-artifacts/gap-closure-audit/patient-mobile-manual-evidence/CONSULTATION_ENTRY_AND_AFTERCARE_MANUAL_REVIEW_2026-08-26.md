# Patient Mobile: Consultation entry and aftercare — manual semantic review

## Scope

تمت قراءة الملفات التالية كاملة من baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`:

| Surface | Source | Lines |
|---|---|---:|
| appointments list | `app/consultations/appointments.tsx` | 1–438 |
| canonical doctor profile | `app/consultations/doctor/[id].tsx` | 1–568 |
| incoming call | `app/consultations/incoming-call.tsx` | 1–162 |
| consultation summary | `app/consultations/summary.tsx` | 1–182 |
| prescription fulfillment handoff | `app/consultations/prescription-from-doctor.tsx` | 1–391 |

## Confirmed defects and missing closures

| ID | Evidence | Finding | Required closure |
|---|---|---|---|
| PM-CONS-ENTRY-001 | `appointments.tsx:27–37, 59–63, 262–323` | list expects lowercase `confirmed/pending/completed/cancelled` and `online`, while other appointment surfaces use uppercase states and `video`; type/state mismatch can hide or misroute appointments | one typed normalized API model and shared status/action policy |
| PM-CONS-ENTRY-002 | `appointments.tsx:262–295` | join/cancel CTAs are driven by client status/type alone; waiting-room admission is not checked and no payer/insurance hold is rendered | server-issued allowed actions or state-gated routing from an owned booking state |
| PM-CONS-ENTRY-003 | `doctor/[id].tsx:50–59, 70–101, 132–162, 524–545` | invalid/missing doctor id falls back to `d1`; 30-day date strip is device-generated; slot selection has no hold/quote; selected slot routes directly to confirmation with client price | no fallback provider identity; server time/calendar/slot hold/quote state before confirmation |
| PM-CONS-ENTRY-004 | `doctor/[id].tsx:103–107, 165–171, 289–294` | favourite is local-only; cancellation/payment FAQ is hard-coded and conflicts with other screens; policy is not quote/payer/state specific | persisted favourites under ownership and server-provided versioned policy/eligibility |
| PM-CONS-ENTRY-005 | `incoming-call.tsx:22–25, 29–58` | caller identity/session/type come entirely from route params; accept performs no server accept/admission and sends `sessionId` to video screen that expects `appointmentId` | signed push/call invitation, server accept mutation and exact session-to-appointment/call token handoff |
| PM-CONS-ENTRY-006 | `incoming-call.tsx:35–69` | auto-timeout calls `reject` from a local timer, retries are absent and reject failure still exits; no missed-call state/accounting is shown | server-owned ringing timeout/missed/rejected event with reliable acknowledgement and notification |
| PM-CONS-AFTER-001 | `summary.tsx:68–80, 95–107` | follow-up advertises an unspecified discounted price and routes directly to booking confirmation without service/slot/quote, which cannot create a valid booking in the reviewed confirm flow | server-issued follow-up entitlement/price/expiry, then provider/slot selection and normal payment/insurance state machine |
| PM-CONS-AFTER-002 | `summary.tsx:120–143` + `prescription-from-doctor.tsx:33–65` | summary’s pharmacy handoff opens a prescription screen that intentionally always sets `prescription` to null; pharmacy order is a timeout route transition, not a prescription-scoped request | owned e-prescription read/token and pharmacy request that preserves lines/substitution/Rx constraints and broadcast→offers→patient selection |
| PM-CONS-AFTER-003 | `prescription-from-doctor.tsx:48–57, 80–85, 321–349` | reminder creation, download/PDF and all prescription content are local/no-op; screen can show an empty state while CTA remains available | real prescription/reminder/document contracts, medication safety validation, audit and truthful disabled states |
| PM-CONS-AFTER-004 | `summary.tsx:166–170` | rating is merely route-driven; it does not check a review eligibility object or prior review | server-provided completion/review eligibility and idempotent review state |

## Conclusion

The upstream profile/list and downstream summary/prescription branch cannot be used as a golden reference for Web. The active booking entry contains client calendar/policy and identity fallbacks, while the prescription and reminder branch is explicitly unimplemented. These must become shared product fixes for Mobile and Web, not a superficial parity exercise.
