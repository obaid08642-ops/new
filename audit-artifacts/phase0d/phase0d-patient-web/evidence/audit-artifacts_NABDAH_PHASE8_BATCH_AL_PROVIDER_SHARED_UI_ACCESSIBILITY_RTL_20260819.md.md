# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_AL_PROVIDER_SHARED_UI_ACCESSIBILITY_RTL_20260819.md`
- **Member SHA-256:** `bd8e9a4b95fa79041c75c9496626cd4dc71fac91f5cccaa521cd441cc6243b86`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: Many provider screens use the shared `NBtn` component. The prior implementation lacked an explicit semantic button role/state/label, did not enlarge its touch target, always vibrated including in web contexts, and retained fixed left-to-rig`
- `25: | Branch upload | **PASS** — archive commit `a7ed9fa` (`fix: improve provider shared button accessibility`) is pushed to `manus/on-live-reconciliation`. |`
- `29: This applies a verified shared-component foundation; it does not prove visual parity on every provider screen, human translation quality in all six languages, native screen-reader behavior, contrast on every theme/device, or clinical workfl`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: Many provider screens use the shared `NBtn` component. The prior implementation lacked an explicit semantic button role/state/label, did not enlarge its touch target, always vibrated including in web contexts, and retained fixed left-to-rig`
- `11: | Accessibility semantics | Shared buttons now expose button role, label and disabled/busy state to assistive technologies. |`
- `14: | Visual hierarchy | Enabled primary actions receive the existing shared elevation token; disabled and non-primary variants retain their controlled contrast semantics. |`
- `15: | Regression coverage | Provider release-contract test asserts the semantic role/state, RTL-aware direction and native-only feedback guards. |`
### state_transitions
- `5: Many provider screens use the shared `NBtn` component. The prior implementation lacked an explicit semantic button role/state/label, did not enlarge its touch target, always vibrated including in web contexts, and retained fixed left-to-rig`
- `11: | Accessibility semantics | Shared buttons now expose button role, label and disabled/busy state to assistive technologies. |`
- `15: | Regression coverage | Provider release-contract test asserts the semantic role/state, RTL-aware direction and native-only feedback guards. |`
- `23: | Provider production web export | **PASS** — Expo web bundle completed. |`
### payment_insurance_relevance
- `15: | Regression coverage | Provider release-contract test asserts the semantic role/state, RTL-aware direction and native-only feedback guards. |`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
