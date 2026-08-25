# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE4_ADMIN_SOS_EMERGENCY_GOVERNANCE_GAPS_20260819.md`
- **Member SHA-256:** `9fb6d8133b67de5a469c11d397ba05571ba98ca3886b7706557cc43f1d83b3dd`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: SOS, emergency location, QR and consent contracts remain **fail-closed** pending owner legal/product approval. This Admin screen must not be treated as a permitted production emergency-dispatch capability.`
- `13: | **P0** | Resolution is an optional-note local action without verified outcome/handover evidence | “Resolve” submits unrestricted notes, then refreshes. No required coded outcome, receiver, clinical/legal attestation, timestamped handover,`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 4 Admin Dashboard — SOS monitor governance gaps`
- `5: SOS, emergency location, QR and consent contracts remain **fail-closed** pending owner legal/product approval. This Admin screen must not be treated as a permitted production emergency-dispatch capability.`
- `12: | **P0** | Hospital assignment uses arbitrary free-text identifier | Operator manually enters a hospital ID; UI has no verified facility selector, capacity/acceptance confirmation, branch scope, receiving contact or assignment acknowledgeme`
- `13: | **P0** | Resolution is an optional-note local action without verified outcome/handover evidence | “Resolve” submits unrestricted notes, then refreshes. No required coded outcome, receiver, clinical/legal attestation, timestamped handover,`
- `14: | **P1** | Full patient phone, address and GPS are displayed/opened in an external map without visible consent/minimum-data controls | Case cards reveal contact, address and precise coordinates and launch Google Maps. | Keep unavailable pen`
- `20: Admin SOS monitoring is **P0 BLOCKED/FAIL-CLOSED**. No deployment or E2E activation is authorized until the owner accepts the required emergency governance contracts and their source/runtime gates.`
### state_transitions
- `5: SOS, emergency location, QR and consent contracts remain **fail-closed** pending owner legal/product approval. This Admin screen must not be treated as a permitted production emergency-dispatch capability.`
- `7: ## Confirmed defects`
- `11: | **P0** | Dashboard exposes active SOS monitoring, hospital assignment and resolution despite unapproved governance | It polls `/emergency/active` every ten seconds, shows patient contact/location, assigns hospital ID and resolves incident`
- `12: | **P0** | Hospital assignment uses arbitrary free-text identifier | Operator manually enters a hospital ID; UI has no verified facility selector, capacity/acceptance confirmation, branch scope, receiving contact or assignment acknowledgeme`
- `13: | **P0** | Resolution is an optional-note local action without verified outcome/handover evidence | “Resolve” submits unrestricted notes, then refreshes. No required coded outcome, receiver, clinical/legal attestation, timestamped handover,`
- `14: | **P1** | Full patient phone, address and GPS are displayed/opened in an external map without visible consent/minimum-data controls | Case cards reveal contact, address and precise coordinates and launch Google Maps. | Keep unavailable pen`
- `15: | **P1** | “No active cases — safe” and fallback patient/time values can be misleading | Empty queue is described as system safety; missing name/date falls back to generic patient/current time. | Use neutral, source-status-aware language an`
- `16: | **P1** | SOS monitor is Arabic-only and has no high-risk action safeguards | Assignment/resolution controls lack six-language accessibility, warning/checklist or step-up confirmation. | Apply approved multilingual accessible emergency UI `
### payment_insurance_relevance
- `14: | **P1** | Full patient phone, address and GPS are displayed/opened in an external map without visible consent/minimum-data controls | Case cards reveal contact, address and precise coordinates and launch Google Maps. | Keep unavailable pen`
### error_empty_loading_retry_cancel
- `5: SOS, emergency location, QR and consent contracts remain **fail-closed** pending owner legal/product approval. This Admin screen must not be treated as a permitted production emergency-dispatch capability.`
- `14: | **P1** | Full patient phone, address and GPS are displayed/opened in an external map without visible consent/minimum-data controls | Case cards reveal contact, address and precise coordinates and launch Google Maps. | Keep unavailable pen`
- `15: | **P1** | “No active cases — safe” and fallback patient/time values can be misleading | Empty queue is described as system safety; missing name/date falls back to generic patient/current time. | Use neutral, source-status-aware language an`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
