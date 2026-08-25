# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE4_ADMIN_COMMAND_CENTER_GAPS_20260819.md`
- **Member SHA-256:** `ac899a73515e179ec955648780ee45d93a7fa8b89272010b50b62066c9ecd08a`
- **Line count:** 14
- **Read range:** `1-14`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: | **P1** | Command-centre outage can look like empty/unknown telemetry | Exceptions are logged to console then loading ends; health may remain null, live orders remain empty, and heatmap says no data. | Show explicit per-source unavailable/`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 4 Admin Dashboard — command-center telemetry gaps`
- `9: | **P1** | Dashboard exposes system-health/telemetry without visible data-classification and scope controls | It combines infrastructure health, live orders and geographic demand in one shell, but shows no authorized role/scope, retention/m`
### state_transitions
- `3: ## Confirmed defects`
- `7: | **P0** | Heatmap invents locations for telemetry records without valid coordinates | Invalid/missing coordinates are rendered at deterministic synthetic panel locations (`[10 + …, 15 + …]`) while still labelled with region/category/count.`
- `8: | **P1** | Command-centre outage can look like empty/unknown telemetry | Exceptions are logged to console then loading ends; health may remain null, live orders remain empty, and heatmap says no data. | Show explicit per-source unavailable/`
- `10: | **P1** | Dashboard is Arabic-first with fixed mappings and limited service/state coverage | Labels, state/kind maps, dates/direction and error states are hard-coded Arabic/RTL; unmapped values fall through raw. | Implement six-language di`
### payment_insurance_relevance
- `10: | **P1** | Dashboard is Arabic-first with fixed mappings and limited service/state coverage | Labels, state/kind maps, dates/direction and error states are hard-coded Arabic/RTL; unmapped values fall through raw. | Implement six-language di`
### error_empty_loading_retry_cancel
- `8: | **P1** | Command-centre outage can look like empty/unknown telemetry | Exceptions are logged to console then loading ends; health may remain null, live orders remain empty, and heatmap says no data. | Show explicit per-source unavailable/`
- `10: | **P1** | Dashboard is Arabic-first with fixed mappings and limited service/state coverage | Labels, state/kind maps, dates/direction and error states are hard-coded Arabic/RTL; unmapped values fall through raw. | Implement six-language di`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
