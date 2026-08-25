# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_PATIENT_UIUX_LOCALIZATION_BASELINE_20260819.md`
- **Member SHA-256:** `004585bce814e57aec649cd6959658debb6ff4cbef504e810a79ba2a4c73f203`
- **Line count:** 33
- **Read range:** `1-33`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `27: | Design-token adoption | Feature screens inspected in checkout, payment processing, consultation confirmation, and family flows contain many literal colors/surfaces alongside tokens | **FIX — design-system audit and token migration in Phas`
- `28: | Navigation accessibility | Bottom navigation touch controls do not provide explicit accessibility role/label/state metadata | **FIX — add semantic accessibility labels/states and test screen-reader order in RTL/LTR** |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: Patient has a central light/dark token palette and six locale files (`ar`, `en`, `ur`, `hi`, `bn`, `tl`). It also relies on `autoTranslate`, which translates only exact Arabic phrase matches rendered through compatible components. A static `
- `27: | Design-token adoption | Feature screens inspected in checkout, payment processing, consultation confirmation, and family flows contain many literal colors/surfaces alongside tokens | **FIX — design-system audit and token migration in Phas`
- `28: | Navigation accessibility | Bottom navigation touch controls do not provide explicit accessibility role/label/state metadata | **FIX — add semantic accessibility labels/states and test screen-reader order in RTL/LTR** |`
- `29: | Design consistency | Bottom bar and payment processing use independent hard-coded visual treatments rather than one governed surface/elevation/state pattern | **FIX — consolidate visual tokens after UX benchmarking and functional remediat`
### state_transitions
- `21: ## Confirmed defects`
- `26: | Translation fallback | `autoTranslate` returns the original text when no exact dictionary phrase match is found | **FIX — create key-based coverage for all critical strings, dynamic/interpolated strings, accessibility labels, errors, and `
- `28: | Navigation accessibility | Bottom navigation touch controls do not provide explicit accessibility role/label/state metadata | **FIX — add semantic accessibility labels/states and test screen-reader order in RTL/LTR** |`
- `29: | Design consistency | Bottom bar and payment processing use independent hard-coded visual treatments rather than one governed surface/elevation/state pattern | **FIX — consolidate visual tokens after UX benchmarking and functional remediat`
- `33: The Patient UI/UX and localization work is **open**. The next audit passes must separate intentional Arabic source copy from untranslated output through device/runtime coverage in all six languages, then record component-level visual defect`
### payment_insurance_relevance
- `7: | Feature group | Files with localization mechanism | Raw visible-text candidates requiring coverage review |`
- `14: | Insurance | 12 | 105 |`
- `26: | Translation fallback | `autoTranslate` returns the original text when no exact dictionary phrase match is found | **FIX — create key-based coverage for all critical strings, dynamic/interpolated strings, accessibility labels, errors, and `
- `27: | Design-token adoption | Feature screens inspected in checkout, payment processing, consultation confirmation, and family flows contain many literal colors/surfaces alongside tokens | **FIX — design-system audit and token migration in Phas`
- `29: | Design consistency | Bottom bar and payment processing use independent hard-coded visual treatments rather than one governed surface/elevation/state pattern | **FIX — consolidate visual tokens after UX benchmarking and functional remediat`
- `33: The Patient UI/UX and localization work is **open**. The next audit passes must separate intentional Arabic source copy from untranslated output through device/runtime coverage in all six languages, then record component-level visual defect`
### error_empty_loading_retry_cancel
- `26: | Translation fallback | `autoTranslate` returns the original text when no exact dictionary phrase match is found | **FIX — create key-based coverage for all critical strings, dynamic/interpolated strings, accessibility labels, errors, and `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
