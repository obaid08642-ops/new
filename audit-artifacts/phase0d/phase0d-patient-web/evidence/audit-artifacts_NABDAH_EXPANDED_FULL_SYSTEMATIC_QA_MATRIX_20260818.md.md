# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_EXPANDED_FULL_SYSTEMATIC_QA_MATRIX_20260818.md`
- **Member SHA-256:** `9b53cfc5d661fa8308379f68514bb5bc8b9838ff85a1bd8be3c31fd3f2554d6d`
- **Line count:** 72
- **Read range:** `1-72`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: This matrix expands the audit from endpoint presence to complete operational journeys. A workflow is not PASS because one endpoint returns 200. It is PASS only when the patient/provider/admin screens, buttons, validation, authorization, bac`
- `7: Each scenario must be recorded with: actor, sandbox identity, precondition, exact screen/button sequence, request method/path, response status and identifiers, state before/after, database/ledger/notification evidence, security result, and `
- `13: | Booking mode | Online/video, clinic/facility, home visit, branch/in-person, delivery, pickup, emergency/urgent where supported |`
- `14: | Payment | Cash, card/sandbox gateway, wallet, zero-value, copay, split payment, failed payment, pending payment, duplicate/idempotent retry |`
- `15: | Coverage | Self-pay, manual insurance upload, eligibility pending, approved, rejected, partially approved, patient copay, out-of-network cash opt-in |`
- `16: | Time | Immediate, scheduled, provider unavailable, provider holiday, slot conflict, reschedule, expired slot, timezone boundary |`
- `19: | Lifecycle | Draft, submitted, routed/broadcast, accepted, rejected, reassigned, confirmed, in progress, awaiting evidence, completed, cancelled, no-show, disputed, refunded/ledger-pending |`
- `23: Every patient flow must include service discovery/list/detail, filter/search, provider/facility detail, availability/slot selection, location and address selection when applicable, beneficiary/family selection, insurance/payment selection, `
- `27: Every provider flow must include onboarding and verification, profile/service/availability/holiday settings, insurance and cash settings, inbox/queue/broadcast intake, accept/reject/reassign with reason, patient and order context, start/arr`
- `35: | Service family | Patient variants | Provider lifecycle | Required special screens/contracts |`
- `37: | Medical consultation | Online video/chat; clinic; home visit; cash/card/wallet/insurance/copay; scheduled/immediate; cancellation/reschedule/no-show | Doctor inbox → accept/reject → confirm slot → waiting room/arrival → chat/video/visit →`
- `38: | Pharmacy | Delivery and pickup; prescription/manual order/reorder/refill; cash/card/wallet/insurance; unavailable/alternative; address and tracking | Broadcast/routing → accept/reject/reassign → stock/alternative → cart confirmation → pre`
### backend_consumers_or_contracts
- `37: | Medical consultation | Online video/chat; clinic; home visit; cash/card/wallet/insurance/copay; scheduled/immediate; cancellation/reschedule/no-show | Doctor inbox → accept/reject → confirm slot → waiting room/arrival → chat/video/visit →`
- `38: | Pharmacy | Delivery and pickup; prescription/manual order/reorder/refill; cash/card/wallet/insurance; unavailable/alternative; address and tracking | Broadcast/routing → accept/reject/reassign → stock/alternative → cart confirmation → pre`
- `39: | Laboratory | Branch and home sample; cash/card/insurance; packages; reschedule/reassign/cancel; result/report | Inbox → accept/reject → appointment/sample collection → collected → analyzing → result → report upload → complete | Package/te`
- `40: | Radiology | Facility/branch and supported home modes; cash/card/insurance; appointment/reschedule/cancel | Inbox → accept/reject → confirm → perform → images/report upload → result delivery → complete | Modality/detail, appointment/locati`
- `41: | Nursing/home-care | Home visit; scheduled/urgent; cash/card/insurance; nurse gender/service/package; reschedule/cancel/no-show | Broadcast/queue → accept → route/arrival/location tracking → start visit → tasks/notes → complete/signature/r`
- `44: | Nutrition | Assessment, meal plans, follow-up, cash/insurance if supported, online/home/clinic | Nutritionist intake → plan → follow-up → adjustment → completion | Goals/intake, allergies, plan versioning, adherence, payment/coverage, saf`
- `46: | Mental health | Assessment, online/clinic/home where supported, cash/insurance, crisis path | Therapist intake → session → follow-up → escalation/referral | Consent/privacy, crisis support, session states, emergency fail-closed, no fabric`
- `58: Every discovered screen/button is recorded with: application, route/file, visible label/icon, actor/role, precondition, enabled/disabled rule, API/database contract, expected loading state, success state, error state, empty state, navigatio`
- `68: For insurance consultations, the lifecycle is: patient submits coverage request → provider/authorized staff sees the complete minimum-necessary patient, service, location, appointment, and insurance details → staff submits to the external i`
- `72: Post-consultation outputs are independent actionable objects: a prescription can start a pharmacy journey; a lab order starts a laboratory journey; a radiology order starts a radiology journey; and a nursing/home-care order starts a home-ca`
### auth_ownership
- `5: This matrix expands the audit from endpoint presence to complete operational journeys. A workflow is not PASS because one endpoint returns 200. It is PASS only when the patient/provider/admin screens, buttons, validation, authorization, bac`
- `17: | Actors | Patient owner, second patient/foreign actor, provider owner, different provider, facility admin, provider staff, platform admin, unauthenticated user |`
- `18: | Network/device | Normal, slow/3G, timeout, offline/reconnect, background/foreground, orientation, denied permissions, RTL/LTR and six locales |`
- `27: Every provider flow must include onboarding and verification, profile/service/availability/holiday settings, insurance and cash settings, inbox/queue/broadcast intake, accept/reject/reassign with reason, patient and order context, start/arr`
- `29: ## Admin journey contract`
- `31: Every admin flow must include authenticated role separation, list/filter/detail, audit trail, moderation/approval/rejection with reason, provider/facility assignment, insurance/commission/ledger visibility, dispute handling, notification/su`
- `39: | Laboratory | Branch and home sample; cash/card/insurance; packages; reschedule/reassign/cancel; result/report | Inbox → accept/reject → appointment/sample collection → collected → analyzing → result → report upload → complete | Package/te`
- `40: | Radiology | Facility/branch and supported home modes; cash/card/insurance; appointment/reschedule/cancel | Inbox → accept/reject → confirm → perform → images/report upload → result delivery → complete | Modality/detail, appointment/locati`
- `41: | Nursing/home-care | Home visit; scheduled/urgent; cash/card/insurance; nurse gender/service/package; reschedule/cancel/no-show | Broadcast/queue → accept → route/arrival/location tracking → start visit → tasks/notes → complete/signature/r`
- `42: | Hospitals/facilities | Facility booking, clinic services, staff-managed patient flows, insurance/cash | Facility admin/staff roles → assignment → service execution → discharge/report | Facility detail, staff invitation/role, hospital-admi`
- `43: | Ambulance/emergency | Emergency request, location permission, fail-closed SOS policy | Dispatch/accept → live location/ETA → arrival → transfer/completion | Emergency consent/location minimization, dispatch status, live map, escalation, s`
- `46: | Mental health | Assessment, online/clinic/home where supported, cash/insurance, crisis path | Therapist intake → session → follow-up → escalation/referral | Consent/privacy, crisis support, session states, emergency fail-closed, no fabric`
### state_transitions
- `7: Each scenario must be recorded with: actor, sandbox identity, precondition, exact screen/button sequence, request method/path, response status and identifiers, state before/after, database/ledger/notification evidence, security result, and `
- `14: | Payment | Cash, card/sandbox gateway, wallet, zero-value, copay, split payment, failed payment, pending payment, duplicate/idempotent retry |`
- `15: | Coverage | Self-pay, manual insurance upload, eligibility pending, approved, rejected, partially approved, patient copay, out-of-network cash opt-in |`
- `19: | Lifecycle | Draft, submitted, routed/broadcast, accepted, rejected, reassigned, confirmed, in progress, awaiting evidence, completed, cancelled, no-show, disputed, refunded/ledger-pending |`
- `23: Every patient flow must include service discovery/list/detail, filter/search, provider/facility detail, availability/slot selection, location and address selection when applicable, beneficiary/family selection, insurance/payment selection, `
- `27: Every provider flow must include onboarding and verification, profile/service/availability/holiday settings, insurance and cash settings, inbox/queue/broadcast intake, accept/reject/reassign with reason, patient and order context, start/arr`
- `37: | Medical consultation | Online video/chat; clinic; home visit; cash/card/wallet/insurance/copay; scheduled/immediate; cancellation/reschedule/no-show | Doctor inbox → accept/reject → confirm slot → waiting room/arrival → chat/video/visit →`
- `38: | Pharmacy | Delivery and pickup; prescription/manual order/reorder/refill; cash/card/wallet/insurance; unavailable/alternative; address and tracking | Broadcast/routing → accept/reject/reassign → stock/alternative → cart confirmation → pre`
- `39: | Laboratory | Branch and home sample; cash/card/insurance; packages; reschedule/reassign/cancel; result/report | Inbox → accept/reject → appointment/sample collection → collected → analyzing → result → report upload → complete | Package/te`
- `40: | Radiology | Facility/branch and supported home modes; cash/card/insurance; appointment/reschedule/cancel | Inbox → accept/reject → confirm → perform → images/report upload → result delivery → complete | Modality/detail, appointment/locati`
- `41: | Nursing/home-care | Home visit; scheduled/urgent; cash/card/insurance; nurse gender/service/package; reschedule/cancel/no-show | Broadcast/queue → accept → route/arrival/location tracking → start visit → tasks/notes → complete/signature/r`
- `43: | Ambulance/emergency | Emergency request, location permission, fail-closed SOS policy | Dispatch/accept → live location/ETA → arrival → transfer/completion | Emergency consent/location minimization, dispatch status, live map, escalation, s`
### payment_insurance_relevance
- `7: Each scenario must be recorded with: actor, sandbox identity, precondition, exact screen/button sequence, request method/path, response status and identifiers, state before/after, database/ledger/notification evidence, security result, and `
- `14: | Payment | Cash, card/sandbox gateway, wallet, zero-value, copay, split payment, failed payment, pending payment, duplicate/idempotent retry |`
- `15: | Coverage | Self-pay, manual insurance upload, eligibility pending, approved, rejected, partially approved, patient copay, out-of-network cash opt-in |`
- `19: | Lifecycle | Draft, submitted, routed/broadcast, accepted, rejected, reassigned, confirmed, in progress, awaiting evidence, completed, cancelled, no-show, disputed, refunded/ledger-pending |`
- `23: Every patient flow must include service discovery/list/detail, filter/search, provider/facility detail, availability/slot selection, location and address selection when applicable, beneficiary/family selection, insurance/payment selection, `
- `27: Every provider flow must include onboarding and verification, profile/service/availability/holiday settings, insurance and cash settings, inbox/queue/broadcast intake, accept/reject/reassign with reason, patient and order context, start/arr`
- `31: Every admin flow must include authenticated role separation, list/filter/detail, audit trail, moderation/approval/rejection with reason, provider/facility assignment, insurance/commission/ledger visibility, dispute handling, notification/su`
- `37: | Medical consultation | Online video/chat; clinic; home visit; cash/card/wallet/insurance/copay; scheduled/immediate; cancellation/reschedule/no-show | Doctor inbox → accept/reject → confirm slot → waiting room/arrival → chat/video/visit →`
- `38: | Pharmacy | Delivery and pickup; prescription/manual order/reorder/refill; cash/card/wallet/insurance; unavailable/alternative; address and tracking | Broadcast/routing → accept/reject/reassign → stock/alternative → cart confirmation → pre`
- `39: | Laboratory | Branch and home sample; cash/card/insurance; packages; reschedule/reassign/cancel; result/report | Inbox → accept/reject → appointment/sample collection → collected → analyzing → result → report upload → complete | Package/te`
- `40: | Radiology | Facility/branch and supported home modes; cash/card/insurance; appointment/reschedule/cancel | Inbox → accept/reject → confirm → perform → images/report upload → result delivery → complete | Modality/detail, appointment/locati`
- `41: | Nursing/home-care | Home visit; scheduled/urgent; cash/card/insurance; nurse gender/service/package; reschedule/cancel/no-show | Broadcast/queue → accept → route/arrival/location tracking → start visit → tasks/notes → complete/signature/r`
### error_empty_loading_retry_cancel
- `7: Each scenario must be recorded with: actor, sandbox identity, precondition, exact screen/button sequence, request method/path, response status and identifiers, state before/after, database/ledger/notification evidence, security result, and `
- `14: | Payment | Cash, card/sandbox gateway, wallet, zero-value, copay, split payment, failed payment, pending payment, duplicate/idempotent retry |`
- `15: | Coverage | Self-pay, manual insurance upload, eligibility pending, approved, rejected, partially approved, patient copay, out-of-network cash opt-in |`
- `18: | Network/device | Normal, slow/3G, timeout, offline/reconnect, background/foreground, orientation, denied permissions, RTL/LTR and six locales |`
- `19: | Lifecycle | Draft, submitted, routed/broadcast, accepted, rejected, reassigned, confirmed, in progress, awaiting evidence, completed, cancelled, no-show, disputed, refunded/ledger-pending |`
- `23: Every patient flow must include service discovery/list/detail, filter/search, provider/facility detail, availability/slot selection, location and address selection when applicable, beneficiary/family selection, insurance/payment selection, `
- `27: Every provider flow must include onboarding and verification, profile/service/availability/holiday settings, insurance and cash settings, inbox/queue/broadcast intake, accept/reject/reassign with reason, patient and order context, start/arr`
- `37: | Medical consultation | Online video/chat; clinic; home visit; cash/card/wallet/insurance/copay; scheduled/immediate; cancellation/reschedule/no-show | Doctor inbox → accept/reject → confirm slot → waiting room/arrival → chat/video/visit →`
- `39: | Laboratory | Branch and home sample; cash/card/insurance; packages; reschedule/reassign/cancel; result/report | Inbox → accept/reject → appointment/sample collection → collected → analyzing → result → report upload → complete | Package/te`
- `40: | Radiology | Facility/branch and supported home modes; cash/card/insurance; appointment/reschedule/cancel | Inbox → accept/reject → confirm → perform → images/report upload → result delivery → complete | Modality/detail, appointment/locati`
- `41: | Nursing/home-care | Home visit; scheduled/urgent; cash/card/insurance; nurse gender/service/package; reschedule/cancel/no-show | Broadcast/queue → accept → route/arrival/location tracking → start visit → tasks/notes → complete/signature/r`
- `47: | AI tools | Symptom triage, drug scan/interactions, translator, skin/AI analysis, health summaries | AI request → processing → result → limitation/escalation | Consent, loading/retry, provenance, no diagnosis overclaim, medical escalation,`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
