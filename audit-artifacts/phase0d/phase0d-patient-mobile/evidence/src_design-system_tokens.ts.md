# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/design-system/tokens.ts`
- **Member SHA-256:** `3d90eee7e7bb6996feaa215529b1ef48aae4ea22b34b011a4efd2f0f6355faae`
- **Line count:** 143
- **Read range:** `1-143`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `2: * Design System Tokens`
- `4: * Wraps src/theme/index.ts and adds runtime Admin override support.`
- `14: // Runtime override store (Admin Dashboard can push updates via RemoteConfig)`
- `39: // Re-export base tokens (tree-shakeable)`
- `47: // Semantic tokens — meaningful names for specific use cases`
- `68: // Component-level tokens — map semantic names to component props`
- `70: export const ComponentTokens = {`
### state_transitions
- `54: destructive: BrandColors.error,`
- `55: destructiveLight: BrandColors.errorLight,`
- `57: success: BrandColors.success,`
- `58: successLight: '#EBF6E9',`
### payment_insurance_relevance
- `84: card: {`
### error_empty_loading_retry_cancel
- `54: destructive: BrandColors.error,`
- `55: destructiveLight: BrandColors.errorLight,`
- `111: skeleton: {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
