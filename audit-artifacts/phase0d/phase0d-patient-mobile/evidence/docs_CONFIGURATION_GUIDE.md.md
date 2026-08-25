# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `docs/CONFIGURATION_GUIDE.md`
- **Member SHA-256:** `80caadfb1f233d47322f2e1c8f1c4575deae5c7a7b935bf28014095faac47c16`
- **Line count:** 23
- **Read range:** `1-23`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Configuration & Admin Guide`
- `3: ## Admin-Ready Architecture`
- `4: All configurations in Nabdah Plus are designed to be modifiable remotely by an Admin Dashboard without requiring an app store update.`
- `14: themeEngine.applyAdminThemeConfig({ primary: '#newColor' });`
- `21: - **Colors**: Always use `design-system` components or `themeEngine.getTokens()`.`
- `22: - **Dimensions**: Use spacing tokens from `src/theme/tokens.ts`.`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
