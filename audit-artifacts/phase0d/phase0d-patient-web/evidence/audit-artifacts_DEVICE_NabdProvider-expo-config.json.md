# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/DEVICE_NabdProvider-expo-config.json`
- **Member SHA-256:** `940aefccaaacb1fea127386a861d97033e31676cdabe1ba134f7eb86216f4b4a`
- **Line count:** 1
- **Read range:** `1-1`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: {"name":"Nabd Plus","slug":"nabd-plus-provider","version":"1.0.0","orientation":"portrait","icon":"./assets/icon.png","scheme":"nabdplus","userInterfaceStyle":"automatic","newArchEnabled":true,"splash":{"image":"./assets/splash.png","resize`
### state_transitions
- `1: {"name":"Nabd Plus","slug":"nabd-plus-provider","version":"1.0.0","orientation":"portrait","icon":"./assets/icon.png","scheme":"nabdplus","userInterfaceStyle":"automatic","newArchEnabled":true,"splash":{"image":"./assets/splash.png","resize`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
