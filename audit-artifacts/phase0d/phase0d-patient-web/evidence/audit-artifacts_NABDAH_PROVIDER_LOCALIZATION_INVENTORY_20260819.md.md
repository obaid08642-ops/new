# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PROVIDER_LOCALIZATION_INVENTORY_20260819.md`
- **Member SHA-256:** `525188b2c031dbadc3f8550da5e8e60ebea692c3255b8c66a41c7b435eb20bdc`
- **Line count:** 40
- **Read range:** `1-40`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `22: The largest current source concentrations are the doctor dashboard (708 simple text branches), shared screens (478), facility dashboard (374), nursing dashboard (329), pharmacy dashboard (298), laboratory dashboard (279), and laboratory/rad`
- `26: The 99-key shared dictionary and six-language `LangProvider` foundation are necessary but do **not** translate provider screens that still choose Arabic or English directly. When the current user selects Urdu, Hindi, Bengali, or Filipino, t`
- `34: 3. Add per-screen locale-key coverage and fallback tests; no screen should silently use an English-only branch for a supported locale.`
### backend_consumers_or_contracts
- `22: The largest current source concentrations are the doctor dashboard (708 simple text branches), shared screens (478), facility dashboard (374), nursing dashboard (329), pharmacy dashboard (298), laboratory dashboard (279), and laboratory/rad`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `28: The scan is deliberately static. It does not replace fluent linguistic review, clinical terminology approval, device font/rendering inspection, RTL/LTR visual QA, accessibility validation, or dynamic text/error/push-notification verificatio`
### payment_insurance_relevance
- `34: 3. Add per-screen locale-key coverage and fallback tests; no screen should silently use an English-only branch for a supported locale.`
- `40: This inventory is evidence of the remaining scope, not evidence that the translations are complete. It does not change the existing requirements for real-device review, deployment approval, sandbox E2E, payment activation, or the fail-close`
### error_empty_loading_retry_cancel
- `28: The scan is deliberately static. It does not replace fluent linguistic review, clinical terminology approval, device font/rendering inspection, RTL/LTR visual QA, accessibility validation, or dynamic text/error/push-notification verificatio`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
