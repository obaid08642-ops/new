# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_PATIENT_PLACEHOLDER_TRIAGE_20260819.md`
- **Member SHA-256:** `f0f268ef0dcb4a9fff941c00d15fbbf054880e84cb2bfdd3ac67e92edf836aef`
- **Line count:** 17
- **Read range:** `1-17`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: | `(tabs)/index.tsx` fallback branch | Unmapped home shortcut shows `Coming Soon` / `الخدمة ستتوفر قريباً` instead of silently succeeding | **HONEST UNAVAILABLE STATE** | Not fabricated data; inventory the shortcut and either wire it to a r`
- `11: | `diagnostics/booking-confirm.tsx:45-74` | Fixed home fee/VAT, generated tomorrow date, fallback provider ID, and `example.com` document URL | **CONFIRMED FIX/BLOCKED** | Already recorded in `NABDAH_PHASE2_MEDICAL_DATA_RISK_REVIEW_20260819`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `5: A second scan of Patient source markers was manually triaged to avoid counting legitimate input placeholders, loading skeletons, historical-remediation comments, or honest empty states as fabricated production data.`
- `9: | `health/reminders.tsx:89` | `handlePlayAlarmTest` displays the Arabic title `منبه الدواء التجريبي` and a warning haptic when the user explicitly tests the alarm | **TEST-ONLY UI / REVIEW** | Keep only if clearly labelled as a local alarm `
- `10: | `(tabs)/index.tsx` fallback branch | Unmapped home shortcut shows `Coming Soon` / `الخدمة ستتوفر قريباً` instead of silently succeeding | **HONEST UNAVAILABLE STATE** | Not fabricated data; inventory the shortcut and either wire it to a r`
- `11: | `diagnostics/booking-confirm.tsx:45-74` | Fixed home fee/VAT, generated tomorrow date, fallback provider ID, and `example.com` document URL | **CONFIRMED FIX/BLOCKED** | Already recorded in `NABDAH_PHASE2_MEDICAL_DATA_RISK_REVIEW_20260819`
- `17: The scan adds no new confirmed synthetic clinical record beyond the diagnostics and maternity findings already documented. The medication alarm preview requires a UX clarity check, while the home fallback requires a navigation inventory but`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `5: A second scan of Patient source markers was manually triaged to avoid counting legitimate input placeholders, loading skeletons, historical-remediation comments, or honest empty states as fabricated production data.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
