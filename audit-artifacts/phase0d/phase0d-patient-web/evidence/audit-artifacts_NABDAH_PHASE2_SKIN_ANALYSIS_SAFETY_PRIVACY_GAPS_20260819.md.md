# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_SKIN_ANALYSIS_SAFETY_PRIVACY_GAPS_20260819.md`
- **Member SHA-256:** `6df4dcba766ada015a2b464605eee2876323c0ebfd67aeee9eb66328872de44c`
- **Line count:** 16
- **Read range:** `1-16`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: | **P0** | The screen fabricates clinical metrics and recommendations absent from Backend output | Backend returns only `condition`, `confidence`, and `recommendation`; the client fills severity, colour, hydration/brightness/smoothness/even`
- `8: | **P0** | Backend failure becomes a plausible analysis result | Backend catches AI failure and returns `condition: Unknown` with low confidence. Client accepts any condition and fills the invented metric/recommendation defaults, making a f`
- `9: | **P0** | Medical image is transmitted without a consent and retention contract | Camera/gallery image is converted to base64 and sent to the AI endpoint; there is no pre-upload sensitive-image consent, purpose/processor disclosure, size/t`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `12: | **P1** | Arabic-only raw copy and static areas impair safe accessibility | Labels, consent-adjacent camera guidance, errors, recommendations, and area selection lack six-language and accessibility coverage. | Complete reviewed AR/EN/UR/HI`
### state_transitions
- `3: ## Confirmed defects`
- `7: | **P0** | The screen fabricates clinical metrics and recommendations absent from Backend output | Backend returns only `condition`, `confidence`, and `recommendation`; the client fills severity, colour, hydration/brightness/smoothness/even`
- `8: | **P0** | Backend failure becomes a plausible analysis result | Backend catches AI failure and returns `condition: Unknown` with low confidence. Client accepts any condition and fills the invented metric/recommendation defaults, making a f`
- `11: | **P1** | AI prompt is diagnostic framing without a governed escalation pathway | Service asks a model to act as a dermatologist and identify a condition; the UI can send a user straight to generic consultation without a safe severity/red-`
- `12: | **P1** | Arabic-only raw copy and static areas impair safe accessibility | Labels, consent-adjacent camera guidance, errors, recommendations, and area selection lack six-language and accessibility coverage. | Complete reviewed AR/EN/UR/HI`
- `16: Skin analysis is **P0 FIX/BLOCKED**. It must not collect or transmit patient images, nor render health results, until the visual-medical consent, privacy, clinical-validation, typed response, truthful error, and multilingual accessibility r`
### payment_insurance_relevance
- `10: | **P1** | Unsupported accuracy and coverage claims are shown | UI claims “50+ skin criteria,” database comparison, and displays confidence as “accuracy,” none of which is established by the raw AI prompt. | Remove unsupported clinical-perf`
- `12: | **P1** | Arabic-only raw copy and static areas impair safe accessibility | Labels, consent-adjacent camera guidance, errors, recommendations, and area selection lack six-language and accessibility coverage. | Complete reviewed AR/EN/UR/HI`
### error_empty_loading_retry_cancel
- `8: | **P0** | Backend failure becomes a plausible analysis result | Backend catches AI failure and returns `condition: Unknown` with low confidence. Client accepts any condition and fills the invented metric/recommendation defaults, making a f`
- `12: | **P1** | Arabic-only raw copy and static areas impair safe accessibility | Labels, consent-adjacent camera guidance, errors, recommendations, and area selection lack six-language and accessibility coverage. | Complete reviewed AR/EN/UR/HI`
- `16: Skin analysis is **P0 FIX/BLOCKED**. It must not collect or transmit patient images, nor render health results, until the visual-medical consent, privacy, clinical-validation, typed response, truthful error, and multilingual accessibility r`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
