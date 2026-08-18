# Nabdah Expanded Full Systematic QA & Workflow Matrix

## Purpose and closure rule

This matrix expands the audit from endpoint presence to complete operational journeys. A workflow is not PASS because one endpoint returns 200. It is PASS only when the patient/provider/admin screens, buttons, validation, authorization, backend transition, database/ledger effects, notifications, and recovery paths agree from start to finish.

Each scenario must be recorded with: actor, sandbox identity, precondition, exact screen/button sequence, request method/path, response status and identifiers, state before/after, database/ledger/notification evidence, security result, and screenshot/log evidence. Any missing screen, impossible state transition, local success toast, fabricated value, missing cancellation/refund path, or unhandled error is `FIX` or `BLOCKED`, never silently accepted.

## Cross-product scenario dimensions

| Dimension | Required variants |
|---|---|
| Booking mode | Online/video, clinic/facility, home visit, branch/in-person, delivery, pickup, emergency/urgent where supported |
| Payment | Cash, card/sandbox gateway, wallet, zero-value, copay, split payment, failed payment, pending payment, duplicate/idempotent retry |
| Coverage | Self-pay, manual insurance upload, eligibility pending, approved, rejected, partially approved, patient copay, out-of-network cash opt-in |
| Time | Immediate, scheduled, provider unavailable, provider holiday, slot conflict, reschedule, expired slot, timezone boundary |
| Actors | Patient owner, second patient/foreign actor, provider owner, different provider, facility admin, provider staff, platform admin, unauthenticated user |
| Network/device | Normal, slow/3G, timeout, offline/reconnect, background/foreground, orientation, denied permissions, RTL/LTR and six locales |
| Lifecycle | Draft, submitted, routed/broadcast, accepted, rejected, reassigned, confirmed, in progress, awaiting evidence, completed, cancelled, no-show, disputed, refunded/ledger-pending |

## Patient journey contract

Every patient flow must include service discovery/list/detail, filter/search, provider/facility detail, availability/slot selection, location and address selection when applicable, beneficiary/family selection, insurance/payment selection, review/confirmation, explicit submit, loading/duplicate prevention, success with real identifier, status tracking, chat/voice/video or map when applicable, report/result/prescription access, cancellation/reschedule, support/dispute, history, notification, and safe error/empty states.

## Provider journey contract

Every provider flow must include onboarding and verification, profile/service/availability/holiday settings, insurance and cash settings, inbox/queue/broadcast intake, accept/reject/reassign with reason, patient and order context, start/arrive/check-in, live execution, required evidence/report/signature, completion, no-show/cancellation/reschedule, patient communication, notifications, wallet/ledger/payout visibility, and ownership enforcement against another provider or facility.

## Admin journey contract

Every admin flow must include authenticated role separation, list/filter/detail, audit trail, moderation/approval/rejection with reason, provider/facility assignment, insurance/commission/ledger visibility, dispute handling, notification/support operations, export/report access, destructive-action confirmation, and denial for provider/patient identities.

## Service matrix

| Service family | Patient variants | Provider lifecycle | Required special screens/contracts |
|---|---|---|---|
| Medical consultation | Online video/chat; clinic; home visit; cash/card/wallet/insurance/copay; scheduled/immediate; cancellation/reschedule/no-show | Doctor inbox → accept/reject → confirm slot → waiting room/arrival → chat/video/visit → prescription/report → lab/radiology referral → complete/rate/payout | Doctor profile, clinic/home location, slots/holidays, insurance approval, payment confirmation, waiting room, call states, chat window/expiry, prescription, referral, no-show, follow-up |
| Pharmacy | Delivery and pickup; prescription/manual order/reorder/refill; cash/card/wallet/insurance; unavailable/alternative; address and tracking | Broadcast/routing → accept/reject/reassign → stock/alternative → cart confirmation → preparation → dispatch/pickup → delivery proof → complete/ledger | Medicine detail, barcode/OCR, prescription upload, cart, substitution consent, delivery address/map, pickup branch, pharmacy queue, stock state, tracking, proof of delivery, reorder/refill |
| Laboratory | Branch and home sample; cash/card/insurance; packages; reschedule/reassign/cancel; result/report | Inbox → accept/reject → appointment/sample collection → collected → analyzing → result → report upload → complete | Package/test selection, branch/home location, sample slot, insurance decision and copay, sample tracking states, report/result viewer/download, ownership |
| Radiology | Facility/branch and supported home modes; cash/card/insurance; appointment/reschedule/cancel | Inbox → accept/reject → confirm → perform → images/report upload → result delivery → complete | Modality/detail, appointment/location, insurance approval, image/report availability, file access, provider type authorization, cancellation |
| Nursing/home-care | Home visit; scheduled/urgent; cash/card/insurance; nurse gender/service/package; reschedule/cancel/no-show | Broadcast/queue → accept → route/arrival/location tracking → start visit → tasks/notes → complete/signature/rating | Address/geolocation permission, nurse profile, availability, tracking, check-in/out, visit notes, no-show, incident, payout |
| Hospitals/facilities | Facility booking, clinic services, staff-managed patient flows, insurance/cash | Facility admin/staff roles → assignment → service execution → discharge/report | Facility detail, staff invitation/role, hospital-admin versus provider permissions, patient tracker, discharge summary, audit log |
| Ambulance/emergency | Emergency request, location permission, fail-closed SOS policy | Dispatch/accept → live location/ETA → arrival → transfer/completion | Emergency consent/location minimization, dispatch status, live map, escalation, safe denial if contract not approved |
| Nutrition | Assessment, meal plans, follow-up, cash/insurance if supported, online/home/clinic | Nutritionist intake → plan → follow-up → adjustment → completion | Goals/intake, allergies, plan versioning, adherence, payment/coverage, safe medical disclaimer |
| Maternity/fertility | Pregnancy tracking, appointments, reminders, clinic/home/online where supported | Care plan/appointment → follow-up → report/reminder | Gestational timeline, reminders, privacy, appointment mode, escalation |
| Mental health | Assessment, online/clinic/home where supported, cash/insurance, crisis path | Therapist intake → session → follow-up → escalation/referral | Consent/privacy, crisis support, session states, emergency fail-closed, no fabricated diagnosis |
| AI tools | Symptom triage, drug scan/interactions, translator, skin/AI analysis, health summaries | AI request → processing → result → limitation/escalation | Consent, loading/retry, provenance, no diagnosis overclaim, medical escalation, data minimization, audit |
| Family/health records | Family member selection, profiles, vitals, wearables, reports, permissions | Authorized caregiver/provider view only | Owner/participant permissions, record history, export/report, wearable sync errors |
| Wallet/financial | Balance, top-up, payment, copay, refund, payout, transaction history | Provider earnings/ledger/payout; admin reconciliation | Idempotency, ledger before/after, gateway failure 502 contract, refund states, no live payment bypass |
| Support/community | Ticket/chat/community/report abuse | Admin/support intake → assign → resolve/escalate | Thread membership, notifications, privacy, moderation, close/reopen |

## Required state-transition checks

For each service, execute positive and negative transitions: create from valid patient; duplicate submit; incomplete data; invalid slot; payment failure; insurance pending/rejected/partial; provider accept/reject; foreign provider mutation; patient cancellation before and after acceptance; provider cancellation; reassignment; reschedule; no-show; execution evidence missing; completion twice; report access by owner and foreign actor; notification emission; history consistency; ledger consistency; retry/idempotency; and recovery after timeout/offline.

## Screen and button audit fields

Every discovered screen/button is recorded with: application, route/file, visible label/icon, actor/role, precondition, enabled/disabled rule, API/database contract, expected loading state, success state, error state, empty state, navigation destination, back/retry behavior, localization key, RTL/LTR behavior, accessibility label, security authorization, and evidence status `PASS`, `FIX`, `BLOCKED`, or `INCONCLUSIVE`.

## Release gates

No workflow is release-ready until the source inventory, backend route/schema mapping, local build/tests, sandbox E2E evidence, security/BOLA matrix, payment limitation, notifications/realtime checks, localization/device checks, and unresolved blockers are all represented in the final register. Payment-dependent cases remain explicitly `BLOCKED — Moyasar activation` rather than being mocked or marked PASS. Consent, QR verifier, emergency location, and error-code contracts remain fail-closed until owner/legal/product approval.
