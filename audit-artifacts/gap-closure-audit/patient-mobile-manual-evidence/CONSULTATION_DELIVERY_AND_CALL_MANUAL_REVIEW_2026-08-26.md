# Patient Mobile: Consultation delivery, call and arrival — manual semantic review

## Scope

تمت قراءة الملفات التالية كاملة من baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`:

| Surface | Source | Lines |
|---|---|---:|
| virtual waiting room | `app/consultations/virtual-waiting-room.tsx` | 1–273 |
| LiveKit call | `app/consultations/video-call.tsx` | 1–251 |
| post-call rating | `app/consultations/post-call-rating.tsx` | 1–143 |
| call history | `app/consultations/call-history.tsx` | 1–356 |
| clinic confirmation | `app/consultations/clinic-confirm.tsx` | 1–200 |
| home-visit tracking | `app/consultations/home-visit-tracking.tsx` | 1–130 |

## Confirmed defects and missing closures

| ID | Evidence | Finding | Required closure |
|---|---|---|---|
| PM-CALL-001 | `virtual-waiting-room.tsx:46–60, 165–207` | the screen reads appointment data only, then always says the patient is next and offers call entry; wait time falls back to a fabricated `02:30` | server-authoritative waiting/admission state, queue position/ETA and short-lived join entitlement; no call CTA before admission |
| PM-CALL-002 | `video-call.tsx:56–76, 118–128` | mount creates a new call session and joins it without an explicit appointment state/admission preflight or recovery UX; failure is only logged and leaves a generic non-connected screen | server validates patient/doctor/appointment/time/admission and returns a purpose-bound expiring token; user-visible denied/expired/network/retry states |
| PM-CALL-003 | `video-call.tsx:118–123, 140–161` | camera and microphone are enabled immediately after connect; ending only disconnects locally then routes to rating, with no demonstrated call-end/ledger/attendance event | device-permission and privacy-preflight UI; server-side call lifecycle/attendance/end event before post-call actions |
| PM-CALL-004 | `video-call.tsx:20–28, 177–187` | native-video module absence silently degrades to an audio-style visual shell without explaining unavailable capability or offering an approved supported fallback | explicit capability/error state and supported browser/native fallback policy; never make a non-video session look like video care |
| PM-CALL-005 | `post-call-rating.tsx:35–51` | rating can be entered based only on route parameter; the UI does not first prove completed owned appointment/call state | rating eligibility must be server enforced and UI should load verified completed booking/participant details |
| PM-CALL-006 | `call-history.tsx:35–38, 83–91` | Redux fallback `patient_default` changes caller interpretation; redial routes using `CallSession.id` as `appointmentId`, which is a type/identity mismatch and may reinitiate an unrelated clinical call | no arbitrary redial for clinical calls; load authorized appointment relation and use a separately permitted follow-up flow |
| PM-CALL-007 | `call-history.tsx:45–56` | pagination computes `hasMore` from stale `calls` closure; failure is only console warning and can appear as an honest empty history | correct pagination state plus explicit error/retry; server must scope history to participant/retention policy |
| PM-CLINIC-001 | `clinic-confirm.tsx:97–129` | screen calls the booking confirmed and renders QR directly from raw appointment id (`NABDAH:APPT:<id>`) without state gate, signed one-time check-in proof or expiry | authorized, signed/rotating check-in credential issued only for eligible confirmed arrival state and scanned server-side |
| PM-CLINIC-002 | `clinic-confirm.tsx:72–95, 174–188` | external directions/contact/chat and cancellation display are not state-sensitive; local policy says 24h/4h bands, contradicting other consultation screens | exact state/role-aware contact and cancellation actions; policy/refund quote/version comes from server and is rendered consistently |
| PM-HOME-001 | `home-visit-tracking.tsx:21–29, 57–64` | claimed tracking map is decorative; it neither subscribes nor polls provider location and gives no consent/precision/retention boundary | authorized live location protocol with consent, freshness, coarse/precise policy, offline/end state and audit |
| PM-HOME-002 | `home-visit-tracking.tsx:82–99` | visit state is compared to Arabic presentation strings, so authoritative enum states cannot safely drive progress | typed, localized server state mapping for assignment, en-route, arrival, check-in, care, completion and exceptions |
| PM-HOME-003 | `home-visit-tracking.tsx:102–113` | chat opens generic doctor chat by `doctor_id` rather than appointment-scoped relationship; it exposes no schedule/assignment/patient ownership guard | appointment-scoped secure thread with membership, PHI policy, retention and failed-send lifecycle |

## Conclusion

The downstream consultation surfaces are not a validated care-delivery closure. They include real API shells and an attempted LiveKit integration, but admission, presence, appointment state, completion, QR check-in, live location, refund policy and PHI messaging remain either parameter-driven, placeholder, locally inferred or insufficiently evidenced. They must be redesigned around the shared booking/call state machine before declaring patient Mobile or Web parity complete.
