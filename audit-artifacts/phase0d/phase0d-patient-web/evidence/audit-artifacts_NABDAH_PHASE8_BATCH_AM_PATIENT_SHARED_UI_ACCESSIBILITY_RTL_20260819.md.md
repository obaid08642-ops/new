# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_AM_PATIENT_SHARED_UI_ACCESSIBILITY_RTL_20260819.md`
- **Member SHA-256:** `2ffc4426bbc6b3262cda68cd3465f6f9600ee207330bac0ff324d611d1f5cb6a`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `25: | Branch upload | **PASS** — archive commit `339404f` (`fix: improve patient shared control accessibility`) is pushed to `manus/on-live-reconciliation`. |`
- `29: The controls are source-validated common components. This work does not prove every screen’s layout, contrast, translation quality, assistive technology behavior, focus order or touch behavior on actual devices. Those are separate Phase 9–1`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: The patient app’s shared button already provided basic semantic state but did not set content direction within the button based on active language and did not enlarge its tappable area. Interactive shared cards also had no explicit semantic`
- `13: | Semantics | Shared buttons retain explicit role/label/disabled/busy state; clickable cards now declare button role. |`
- `14: | Regression coverage | A lightweight source contract asserts semantic role/state, language-aware direction and shared touch-target expansion. |`
### state_transitions
- `5: The patient app’s shared button already provided basic semantic state but did not set content direction within the button based on active language and did not enlarge its tappable area. Interactive shared cards also had no explicit semantic`
- `13: | Semantics | Shared buttons retain explicit role/label/disabled/busy state; clickable cards now declare button role. |`
- `14: | Regression coverage | A lightweight source contract asserts semantic role/state, language-aware direction and shared touch-target expansion. |`
- `21: | Patient full test suite | **PASS** — full Jest command completed. |`
- `23: | Patient production web export | **PASS** — Expo web bundle completed. |`
### payment_insurance_relevance
- `5: The patient app’s shared button already provided basic semantic state but did not set content direction within the button based on active language and did not enlarge its tappable area. Interactive shared cards also had no explicit semantic`
- `12: | Touch accessibility | Gradient and non-gradient button variants provide a six-point hit slop; interactive cards provide a four-point hit slop. |`
- `13: | Semantics | Shared buttons retain explicit role/label/disabled/busy state; clickable cards now declare button role. |`
- `14: | Regression coverage | A lightweight source contract asserts semantic role/state, language-aware direction and shared touch-target expansion. |`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
