# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE7_COMPETITOR_UX_BENCHMARK_20260819.md`
- **Member SHA-256:** `4d4fe5ad39986889bd0574a5d8faf4999a7da330f6dff9bbbbfac7440c804446`
- **Line count:** 107
- **Read range:** `1-107`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Phase 7 — Competitor research and screen-by-screen UX benchmark`
- `5: This benchmark compares Nabdah’s **source-audited journeys** with publicly published product descriptions, app-store listings and official service pages for regional and global reference products. It is not a claim that an external product’`
- `14: | Pharmacy | Prescription upload/validation, delivery **or** pickup, substitutions/fulfilment, tracking, and pharmacist help | Complete a canonical order lifecycle and show it as a timeline; do not decrement inventory or claim delivery befo`
- `15: | Diagnostics | A booking can be confirmed, rescheduled or cancelled; a result is a private longitudinal record, not a generic link | Unify lab/radiology booking and result ownership; make collection/exam/result/report states visible and au`
- `21: ## Patient experience comparison — discovery, booking and care`
- `23: | Nabdah screen / decision point | Source-audit gap recorded in Phases 2–6 | Public benchmark pattern | Phase 8 design and contract requirement |`
- `27: | Doctor profile | Public DTO is not allowlisted and similar-provider query can include inactive records. | Vezeeta presents service-relevant specialty, fee and verified-visit review context; Cura explains modalities, response expectation a`
- `28: | Consultation choice | Clinic/video/home, cash/insurance and asynchronous paths are not consistently distinguished; insurance flow can auto-confirm. | Teladoc’s public journey uses a brief intake, provider choice, phone/video visit and an `
- `29: | Slot selection and confirmation | Monthly report uses wrong slot field and state transitions may bypass workflow engine. | Vezeeta lets patients choose an available day/time; its public copy states provider-defined working hours and booki`
- `30: | Pre-visit intake | AI and medical-input features include mismatched contracts/local fallbacks. | Teladoc asks questions before the visit so the clinician is prepared and supports pre-visit document/image upload. [4] | Capture reason, symp`
- `31: | Visit room / chat / call | Realtime generic room join and waiting-room authorization are unsafe; family chat uses legacy membership data. | Cura describes text, voice-note, voice and video in-app contact; Teladoc describes phone/video vis`
- `32: | Care plan, prescription and follow-up | Local/fabricated doctor EHR/prescription flows exist in Provider; medical orders are not consistently canonical. | Teladoc exposes post-visit plan, prescriptions, labs and next steps in the patient `
### backend_consumers_or_contracts
- `13: | Consultation | One clear service choice, patient-preference filters, real availability, a prepared visit, then a durable care plan | Make clinic, video and home consultation separate, explicit service contracts with truthful slot, price a`
- `15: | Diagnostics | A booking can be confirmed, rescheduled or cancelled; a result is a private longitudinal record, not a generic link | Unify lab/radiology booking and result ownership; make collection/exam/result/report states visible and au`
- `28: | Consultation choice | Clinic/video/home, cash/insurance and asynchronous paths are not consistently distinguished; insurance flow can auto-confirm. | Teladoc’s public journey uses a brief intake, provider choice, phone/video visit and an `
- `32: | Care plan, prescription and follow-up | Local/fabricated doctor EHR/prescription flows exist in Provider; medical orders are not consistently canonical. | Teladoc exposes post-visit plan, prescriptions, labs and next steps in the patient `
- `37: | Radiology booking/report | Report upload uses fabricated links and foreign/cross-scope report access needs hardening. | SEHA publishes patient access to medical records, lab and radiology results, scheduling and authorized family access. `
- `38: | Results and longitudinal record | Monthly health report references `scheduled_at` instead of canonical slot field; privacy/ownership has unresolved gaps. | SEHA centralizes records, lab/radiology results, measurements, allergies and famil`
- `54: | Pharmacy/lab/radiology/nursing fulfilment | Pharmacy/logistics and diagnostics experiences make tracking and report completion explicit; home care makes assignment/arrival visible. [5] [6] [7] [11] | Replace broadcast/wrong endpoints and `
### auth_ownership
- `5: This benchmark compares Nabdah’s **source-audited journeys** with publicly published product descriptions, app-store listings and official service pages for regional and global reference products. It is not a claim that an external product’`
- `15: | Diagnostics | A booking can be confirmed, rescheduled or cancelled; a result is a private longitudinal record, not a generic link | Unify lab/radiology booking and result ownership; make collection/exam/result/report states visible and au`
- `17: | Mental health | A privacy-led entry, immediate or scheduled session choice, verified specialist fit, modality choice and crisis exit | Do not let mood logging or an AI response masquerade as care; use clear safety escalation and protected`
- `19: | Medication adherence | Practical dose schedule, taken/skipped logging, caregiver permission and progress report | Fix interval mapping/precision, bind notification schedules to a canonical prescription/reminder record and require consent `
- `25: | Home and service discovery | Service entry points exist but cross-service visual vocabulary, translation coverage and RTL/LTR behavior are inconsistent; bottom navigation forces RTL for every language. | Vezeeta places clinic, telehealth,`
- `31: | Visit room / chat / call | Realtime generic room join and waiting-room authorization are unsafe; family chat uses legacy membership data. | Cura describes text, voice-note, voice and video in-app contact; Teladoc describes phone/video vis`
- `35: | Pharmacy cart and fulfilment | Legacy/parallel pharmacy collections, wrong endpoint calls, early stock mutation and bad reorder/refill parameters create divergent truth. | Pharmacy references make pickup, delivery, payment and tracking se`
- `38: | Results and longitudinal record | Monthly health report references `scheduled_at` instead of canonical slot field; privacy/ownership has unresolved gaps. | SEHA centralizes records, lab/radiology results, measurements, allergies and famil`
- `40: | Mental-health landing / matching | Mood journal submits fixed values and wrong fields; local clinical fallbacks and AI response contracts are unsafe. | Labayh presents immediate and scheduled sessions, specialty/budget filtering, modality`
- `44: | Profile, family, privacy and support | Family permissions mismatch; privacy export/deletion and consent screens are not enforced. | SEHA exposes authorized family access as an explicit request; Ovia exposes controlled sharing and account `
- `56: | Device/security and privacy | The health-category benchmark consistently exposes sensitive data with explicit permission/security statements, but public claims are not proof of technical sufficiency. [9] [10] [17] | Implement actual serve`
- `66: | Visual language | Replace emoji and inconsistent glyphs with one licensed/vector icon family. Define semantic tokens for surface, primary, success, warning, critical and clinical-info—not arbitrary per-screen colors. Use calm contrast-saf`
### state_transitions
- `13: | Consultation | One clear service choice, patient-preference filters, real availability, a prepared visit, then a durable care plan | Make clinic, video and home consultation separate, explicit service contracts with truthful slot, price a`
- `15: | Diagnostics | A booking can be confirmed, rescheduled or cancelled; a result is a private longitudinal record, not a generic link | Unify lab/radiology booking and result ownership; make collection/exam/result/report states visible and au`
- `16: | Home care | Select service, time, location and patient/family profile, then receive confirmation, reminders and live status | Use location only after purpose consent, make caregiver assignment explicit and support only lawful tracking whi`
- `17: | Mental health | A privacy-led entry, immediate or scheduled session choice, verified specialist fit, modality choice and crisis exit | Do not let mood logging or an AI response masquerade as care; use clear safety escalation and protected`
- `18: | Nutrition and maternity | Goal-based onboarding, source-labelled self-tracking, progressive care plan and calendar/reminders | Treat all inputs as patient-entered/self-reported until clinically verified; never create pregnancy, diet or me`
- `27: | Doctor profile | Public DTO is not allowlisted and similar-provider query can include inactive records. | Vezeeta presents service-relevant specialty, fee and verified-visit review context; Cura explains modalities, response expectation a`
- `28: | Consultation choice | Clinic/video/home, cash/insurance and asynchronous paths are not consistently distinguished; insurance flow can auto-confirm. | Teladoc’s public journey uses a brief intake, provider choice, phone/video visit and an `
- `29: | Slot selection and confirmation | Monthly report uses wrong slot field and state transitions may bypass workflow engine. | Vezeeta lets patients choose an available day/time; its public copy states provider-defined working hours and booki`
- `31: | Visit room / chat / call | Realtime generic room join and waiting-room authorization are unsafe; family chat uses legacy membership data. | Cura describes text, voice-note, voice and video in-app contact; Teladoc describes phone/video vis`
- `32: | Care plan, prescription and follow-up | Local/fabricated doctor EHR/prescription flows exist in Provider; medical orders are not consistently canonical. | Teladoc exposes post-visit plan, prescriptions, labs and next steps in the patient `
- `33: | Cash, insurance and payment | Insurance approval-to-payment and split-payment routes have critical contract gaps; payment retry/webhook/transaction controls are unsafe. | Cura separates insurance-supported specialist advice from non-cover`
- `34: | Pharmacy prescription entry | Diagnostics booking and several commerce paths display fabricated fee/tax/appointment data; chronic refill mutates inventory too early. | Nahdi publishes prescription upload, delivery/pickup and pharmacist su`
### payment_insurance_relevance
- `5: This benchmark compares Nabdah’s **source-audited journeys** with publicly published product descriptions, app-store listings and official service pages for regional and global reference products. It is not a claim that an external product’`
- `13: | Consultation | One clear service choice, patient-preference filters, real availability, a prepared visit, then a durable care plan | Make clinic, video and home consultation separate, explicit service contracts with truthful slot, price a`
- `25: | Home and service discovery | Service entry points exist but cross-service visual vocabulary, translation coverage and RTL/LTR behavior are inconsistent; bottom navigation forces RTL for every language. | Vezeeta places clinic, telehealth,`
- `26: | Doctor/facility search | Current public-care details can expose inactive/unpublished providers and broad documents. | Vezeeta provides specialty, appointment type, title, gender, availability, fee and payment filters, then sort; it distin`
- `27: | Doctor profile | Public DTO is not allowlisted and similar-provider query can include inactive records. | Vezeeta presents service-relevant specialty, fee and verified-visit review context; Cura explains modalities, response expectation a`
- `28: | Consultation choice | Clinic/video/home, cash/insurance and asynchronous paths are not consistently distinguished; insurance flow can auto-confirm. | Teladoc’s public journey uses a brief intake, provider choice, phone/video visit and an `
- `29: | Slot selection and confirmation | Monthly report uses wrong slot field and state transitions may bypass workflow engine. | Vezeeta lets patients choose an available day/time; its public copy states provider-defined working hours and booki`
- `33: | Cash, insurance and payment | Insurance approval-to-payment and split-payment routes have critical contract gaps; payment retry/webhook/transaction controls are unsafe. | Cura separates insurance-supported specialist advice from non-cover`
- `34: | Pharmacy prescription entry | Diagnostics booking and several commerce paths display fabricated fee/tax/appointment data; chronic refill mutates inventory too early. | Nahdi publishes prescription upload, delivery/pickup and pharmacist su`
- `35: | Pharmacy cart and fulfilment | Legacy/parallel pharmacy collections, wrong endpoint calls, early stock mutation and bad reorder/refill parameters create divergent truth. | Pharmacy references make pickup, delivery, payment and tracking se`
- `36: | Lab appointment and home collection | Booking UI has fake financial/appointment facts and provider operations bypass workflow state transitions. | Al Borg’s published listing includes booking, rescheduling, cancellation and report viewing`
- `39: | Home nursing/care request | Patient and Provider routes/responses are incomplete or fabricated; location/emergency consent remains fail-closed. | Call Doctor describes a sequence of service → date/time/location → patient profile → confirm`
### error_empty_loading_retry_cancel
- `15: | Diagnostics | A booking can be confirmed, rescheduled or cancelled; a result is a private longitudinal record, not a generic link | Unify lab/radiology booking and result ownership; make collection/exam/result/report states visible and au`
- `27: | Doctor profile | Public DTO is not allowlisted and similar-provider query can include inactive records. | Vezeeta presents service-relevant specialty, fee and verified-visit review context; Cura explains modalities, response expectation a`
- `28: | Consultation choice | Clinic/video/home, cash/insurance and asynchronous paths are not consistently distinguished; insurance flow can auto-confirm. | Teladoc’s public journey uses a brief intake, provider choice, phone/video visit and an `
- `31: | Visit room / chat / call | Realtime generic room join and waiting-room authorization are unsafe; family chat uses legacy membership data. | Cura describes text, voice-note, voice and video in-app contact; Teladoc describes phone/video vis`
- `33: | Cash, insurance and payment | Insurance approval-to-payment and split-payment routes have critical contract gaps; payment retry/webhook/transaction controls are unsafe. | Cura separates insurance-supported specialist advice from non-cover`
- `35: | Pharmacy cart and fulfilment | Legacy/parallel pharmacy collections, wrong endpoint calls, early stock mutation and bad reorder/refill parameters create divergent truth. | Pharmacy references make pickup, delivery, payment and tracking se`
- `36: | Lab appointment and home collection | Booking UI has fake financial/appointment facts and provider operations bypass workflow state transitions. | Al Borg’s published listing includes booking, rescheduling, cancellation and report viewing`
- `44: | Profile, family, privacy and support | Family permissions mismatch; privacy export/deletion and consent screens are not enforced. | SEHA exposes authorized family access as an explicit request; Ovia exposes controlled sharing and account `
- `50: | Onboarding and credential approval | Labayh’s consultant listing describes certificate/license upload, interview, activation and training before patient requests are available. [17] | Keep provider in a visibly `pending_review` state with`
- `55: | Payout, wallet and support | Vezeeta’s provider listing references invoices/payments; it also illustrates no-show reduction using confirmation/online payment. [18] | Present ledger entries as pending/available/paid/reversed with source or`
- `78: | **P1** | Consultation and diagnostics journeys | Intent/slot/receipt/status/care-plan screens, service-specific cancellation/reschedule and consistent order/booking timeline. |`
- `82: | **P2** | Progressive premium polish | Motion/accessibility refinements, empty/error/retry states, educational content navigation and future device integrations only after the underlying contract is real. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
