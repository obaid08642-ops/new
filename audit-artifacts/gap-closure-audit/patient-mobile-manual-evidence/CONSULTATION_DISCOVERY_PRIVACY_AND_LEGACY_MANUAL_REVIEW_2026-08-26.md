# Patient Mobile: Consultation discovery, privacy and legacy routes — manual semantic review

## Scope

تمت قراءة الملفات التالية كاملة من baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`:

| Surface | Source | Lines |
|---|---|---:|
| follow-up detail | `app/consultations/follow-up.tsx` | 1–209 |
| direct chat with doctor | `app/consultations/chat-with-doctor.tsx` | 1–219 |
| in-clinic waiting room | `app/consultations/waiting-room.tsx` | 1–324 |
| clinic map | `app/consultations/clinic-location.tsx` | 1–110 |
| facility profile | `app/consultations/clinic/[id].tsx` | 1–112 |
| specialty discovery | `app/consultations/specialty-select.tsx` | 1–132 |
| doctor search | `app/consultations/doctor-search.tsx` | 1–247 |
| legacy doctor profile redirect | `app/consultations/doctor-profile.tsx` | 1–39 |
| legacy offer redirect | `app/consultations/offer/[id].tsx` | 1–14 |
| legacy video redirect | `app/consultations/video/[id].tsx` | 1–9 |
| report sharing | `app/consultations/share-report.tsx` | 1–263 |

## Confirmed defects and missing closures

| ID | Evidence | Finding | Required closure |
|---|---|---|---|
| PM-CONS-DISC-001 | `follow-up.tsx:141–149, 177–193` | prescription fulfillment opens general pharmacy tab and doctor chat is doctor-only, not appointment/prescription scoped; rebooking loses follow-up entitlement/discount context | exact appointment/prescription/follow-up identifiers and server-controlled follow-up entitlement/price |
| PM-CONS-DISC-002 | `chat-with-doctor.tsx:16–85, 113–132, 185–197` | route receives only doctor id and creates a general direct thread; appointment scope is ignored. The mic icon sends text, not voice. Membership/PHI policy requires backend reconciliation | appointment-scoped or separately consented direct thread, attachment/voice policy, membership enforcement, audit and clear control semantics |
| PM-CONS-DISC-003 | `waiting-room.tsx:29–44, 120–249` | waiting room performs a single GET, has no live subscription/polling, hard-codes `second floor`, and has no state/admission transition | authoritative queue/arrival state with refresh/notification/admission and real facility-location data |
| PM-CONS-DISC-004 | `clinic-location.tsx:22–42, 62–97` | missing coordinates silently default to Riyadh (`24.7136, 46.6753`) and can send a patient to the wrong place | no geographical fallback; show unavailable/retry, validate appointment facility location before map/directions |
| PM-CONS-DISC-005 | `clinic/[id].tsx:67–87, 93–101` | facility screen presents hard-coded 4.9 rating and fallback Nabd hospital/city/description; doctor navigation uses legacy alias | remove all facility demo fallbacks and make rating/certification/address data authoritative; migrate to canonical route |
| PM-CONS-DISC-006 | `specialty-select.tsx:26–39, 83–107` | specialty search filters only `name_ar` and passes Arabic display name as the doctor-search criterion | stable specialty ID/slug with all supported localized labels; backend filter semantics and true available count |
| PM-CONS-DISC-007 | `doctor-search.tsx:38–90` | response is re-filtered/re-sorted locally; wait is formatted Arabic text then lexically compared and price is a generic field rather than quote/capability-specific price | backend-authoritative filters/sort/capability/next slot and clear unknown-data presentation |
| PM-CONS-DISC-008 | `offer/[id].tsx:2–12` | old consultation offer route redirects to `/offers/[id]`; the actual offer semantics are outside consultation source and must be audited before claim | map/deprecate redirect and reconcile `/offers/[id]` with the appropriate provider/price/payment domain |
| PM-CONS-DISC-009 | `video/[id].tsx:2–8` + `video-call.tsx:30–76` | legacy video path passes `sessionId`, but reviewed video room reads `appointmentId`; this is a confirmed broken legacy call route | remove or repair via server-issued call-session relation and an integration test |
| PM-CONS-DISC-010 | `share-report.tsx:50–94, 117–133` | reports/diagnosis/summary are concatenated as plain text and sent to any device-share target; no recipient-scoped consent, selection confirmation, expiry, audit or revocation contract appears | explicit patient disclosure gate and policy, or secure recipient-bound report-share token with scope/expiry/audit/revocation; avoid silently treating OS share as clinical doctor sharing |

## Conclusion

All remaining consultation candidate sources have now been read. The domain contains a mixture of genuine reads, partial shells, legacy redirects and confirmed static/unsafe behavior. Mobile cannot serve as an unqualified specification for Web: the final plan must correct shared state, policy, PHI sharing and route identity before applying visual parity.
