# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE7_FINAL_CLOSURE_DOUBLE_CHECK_20260819.md`
- **Member SHA-256:** `f848925df4ef11661fc87868aaa8db3a28a42a572de04fc2c9a108d0386e474a`
- **Line count:** 32
- **Read range:** `1-32`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: | Pharmacy/medication delivery: Nahdi, Al-Dawaa and comparable fulfilment patterns | Prescription upload, delivery/pickup, payment, tracking, barcode/image and pharmacist-support patterns sourced in references 5–6. | **COMPLETE** |`
- `13: | Labs/diagnostics and radiology | Booking, rescheduling/cancellation, reports, longitudinal record and authorized family patterns sourced in references 7, 9–10. | **COMPLETE** |`
- `20: | Screen-by-screen comparison and design direction | Patient and provider tables plus premium UI system and prioritized Phase 8 backlog in `NABDAH_PHASE7_COMPETITOR_UX_BENCHMARK_20260819.md`. | **COMPLETE** |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `15: | Mental health | Immediate/scheduled sessions, specialist filtering, modality, programs, privacy, matching and crisis exclusion sourced in references 12–13. | **COMPLETE** |`
- `18: | Medication reminders | Precise schedule, adherence history, caregiver permission, report and interaction-alert patterns sourced in reference 16. | **COMPLETE** |`
### state_transitions
- `7: ## Reconciliation against the approved scope`
- `13: | Labs/diagnostics and radiology | Booking, rescheduling/cancellation, reports, longitudinal record and authorized family patterns sourced in references 7, 9–10. | **COMPLETE** |`
- `14: | Home nursing/care | Eligibility/referral, appointment notification, home visit service/time/location/patient, status and payment patterns sourced in references 8 and 11. | **COMPLETE** |`
- `17: | Maternity/pregnancy and fertility | Journey selection, symptom tracking, milestone/calendar, sharing/PIN and respectful state-management patterns sourced in reference 15. | **COMPLETE** |`
- `19: | Provider reception/fulfilment | Credential activation, queue, communication, calendar, multi-site, patient list, no-show and invoice/payment patterns sourced in references 17–18. | **COMPLETE** |`
- `24: 1. All externally sourced statements are linked in the benchmark’s reference section.`
- `32: **COMPLETE — design-research evidence is ready for Phase 8.** The mandatory next phase is source remediation: correct the confirmed contracts and security gaps, then apply a unified multilingual premium UI system only to truthful server-bac`
### payment_insurance_relevance
- `11: | Online consultations: Visita/Vezeeta, Teladoc, Seha, Cura, Altibbi patterns | Consultation discovery, filters, modality, intake, care-plan, follow-up and coverage patterns sourced in benchmark references 1–4. | **COMPLETE** |`
- `12: | Pharmacy/medication delivery: Nahdi, Al-Dawaa and comparable fulfilment patterns | Prescription upload, delivery/pickup, payment, tracking, barcode/image and pharmacist-support patterns sourced in references 5–6. | **COMPLETE** |`
- `14: | Home nursing/care | Eligibility/referral, appointment notification, home visit service/time/location/patient, status and payment patterns sourced in references 8 and 11. | **COMPLETE** |`
- `19: | Provider reception/fulfilment | Credential activation, queue, communication, calendar, multi-site, patient list, no-show and invoice/payment patterns sourced in references 17–18. | **COMPLETE** |`
- `27: 4. It preserves all Phase 2–6 safety verdicts: no mock clinical fact, no automatic insurance approval, no ungated payment/PHI, and emergency/QR/consent remain fail-closed.`
### error_empty_loading_retry_cancel
- `13: | Labs/diagnostics and radiology | Booking, rescheduling/cancellation, reports, longitudinal record and authorized family patterns sourced in references 7, 9–10. | **COMPLETE** |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
