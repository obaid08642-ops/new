# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `docs/DEVELOPER_GUIDE.md`
- **Member SHA-256:** `59c81d1ad4cff7b52d0f097d6535797d84729bfa0846deb7e6a89196a76668be`
- **Line count:** 36
- **Read range:** `1-36`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `21: - **UI & Presentation**: Built with React Native & Expo Router.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `22: - **Design System**: Centralized in `src/design-system/` with strict use of tokens (`src/theme/tokens.ts`).`
- `25: - **Services**: Isolated singleton managers (`src/services/`) for APIs, analytics, feature flags, permissions, and notifications.`
### state_transitions
- `23: - **State Management**: Redux Toolkit + Redux Persist (in `src/store/`).`
- `33: 1. Ensure `npx tsc --noEmit` passes with 0 errors.`
- `34: 2. Ensure `npm run lint` passes with 0 errors.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `33: 1. Ensure `npx tsc --noEmit` passes with 0 errors.`
- `34: 2. Ensure `npm run lint` passes with 0 errors.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
