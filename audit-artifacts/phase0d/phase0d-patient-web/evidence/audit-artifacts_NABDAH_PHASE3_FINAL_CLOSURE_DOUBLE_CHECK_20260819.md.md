# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE3_FINAL_CLOSURE_DOUBLE_CHECK_20260819.md`
- **Member SHA-256:** `79d7831d2b3b481e9d333a17bd807d31bc72992086ad93b87b292e6d696dfe67`
- **Line count:** 35
- **Read range:** `1-35`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `16: | Radiology booking, safety questionnaire, insurance, reschedule and report/images | `NABDAH_PHASE3_PROVIDER_RADIOLOGY_OPERATIONS_GAPS_20260819.md` | **Reviewed — P0 FIX/BLOCKED** |`
### backend_consumers_or_contracts
- `13: | Doctor receiving queue, cash/insurance, realtime, consultation/call/chat, EHR, prescriptions, clinical documents and referrals | `NABDAH_PHASE3_PROVIDER_DOCTOR_RECEPTION_GAPS_20260819.md`; `NABDAH_PHASE3_PROVIDER_DOCTOR_CLINICAL_WORKFLOW_`
- `17: | Nursing/home-care intake, response, visit state, availability, tracking and completion | `NABDAH_PHASE3_PROVIDER_NURSING_OPERATIONS_GAPS_20260819.md` | **Reviewed — P0 FIX/BLOCKED** |`
### auth_ownership
- `18: | Facility/hospital branch scope, staff administration, resources and internal chat | `NABDAH_PHASE3_PROVIDER_FACILITY_OPERATIONS_GAPS_20260819.md`; `NABDAH_PHASE3_PROVIDER_SHARED_COMMUNICATION_SUPPORT_GAPS_20260819.md` | **Reviewed — P0 FI`
- `27: 1. **All Provider service roles were covered:** doctor, pharmacy, laboratory, radiology, nursing/home care, facility/hospital and ambulance.`
- `35: **AUDIT-COMPLETE / REMEDIATION-DEFERRED.** Provider source discovery is complete enough to advance to Phase 4 Admin Dashboard audit. The Provider application is **not release-ready**: multiple P0 financial, clinical, PHI, authorization, tra`
### state_transitions
- `5: This document closes **audit discovery and contract review only**. It does not assert production readiness, source remediation, device validation, or production E2E completion. Every confirmed defect remains open in `todo.md` for Phase 8, P`
- `9: | Planned Phase 3 area | Audit evidence | Closure status |`
- `17: | Nursing/home-care intake, response, visit state, availability, tracking and completion | `NABDAH_PHASE3_PROVIDER_NURSING_OPERATIONS_GAPS_20260819.md` | **Reviewed — P0 FIX/BLOCKED** |`
- `28: 2. **All lifecycle segments were covered:** registration/pending approval, configuration/availability, order reception, accept/reject, execution/status, insurance/payment, report/document, communication, wallet, settings and support.`
- `29: 3. **Safety boundaries remain explicit:** emergency/SOS/location/QR/consent are **not enabled**; no audit result loosens the approved fail-closed rule.`
### payment_insurance_relevance
- `12: | Doctor profile, availability, prices, coverage, credentials and insurance | `NABDAH_PHASE3_DOCTOR_PROVIDER_CONFIGURATION_GAPS_20260819.md` | **Reviewed — FIX/BLOCKED** |`
- `13: | Doctor receiving queue, cash/insurance, realtime, consultation/call/chat, EHR, prescriptions, clinical documents and referrals | `NABDAH_PHASE3_PROVIDER_DOCTOR_RECEPTION_GAPS_20260819.md`; `NABDAH_PHASE3_PROVIDER_DOCTOR_CLINICAL_WORKFLOW_`
- `15: | Laboratory inbox, sample workflow, provider insurance, results and navigation | `NABDAH_PHASE3_PROVIDER_LAB_OPERATIONS_GAPS_20260819.md` | **Reviewed — FIX/BLOCKED** |`
- `16: | Radiology booking, safety questionnaire, insurance, reschedule and report/images | `NABDAH_PHASE3_PROVIDER_RADIOLOGY_OPERATIONS_GAPS_20260819.md` | **Reviewed — P0 FIX/BLOCKED** |`
- `20: | Wallet, earnings, payout and bank-account path | `NABDAH_PHASE3_PROVIDER_PAYOUT_WALLET_GAPS_20260819.md` | **Reviewed — P0 FIX/BLOCKED** |`
- `28: 2. **All lifecycle segments were covered:** registration/pending approval, configuration/availability, order reception, accept/reject, execution/status, insurance/payment, report/document, communication, wallet, settings and support.`
### error_empty_loading_retry_cancel
- `28: 2. **All lifecycle segments were covered:** registration/pending approval, configuration/availability, order reception, accept/reject, execution/status, insurance/payment, report/document, communication, wallet, settings and support.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
