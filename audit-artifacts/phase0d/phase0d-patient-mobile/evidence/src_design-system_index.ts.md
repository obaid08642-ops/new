# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/design-system/index.ts`
- **Member SHA-256:** `883cbd6d379397d8a343463ae6481031b2b85103ee3791aabf4b363ff9dc1382`
- **Line count:** 101
- **Read range:** `1-101`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `11: // ── Tokens ───────────────────────────────────────────────────────────────────`
- `15: SemanticColors, ComponentTokens,`
- `18: } from './tokens';`
- `85: // ── OTP Input ────────────────────────────────────────────────────────────────`
- `87: DSOTPInput,`
- `88: type DSOTPInputProps,`
- `89: } from './components/OTPInput';`
### state_transitions
- `38: type DSInputProps, type InputVariant, type InputState,`
- `60: // ── Loading / Skeleton ────────────────────────────────────────────────────────`
- `62: DSSpinner, DSLoadingOverlay, DSSkeleton,`
- `64: type DSSpinnerProps, type DSLoadingOverlayProps, type DSSkeletonProps,`
- `65: } from './components/Loading';`
- `67: // ── States ───────────────────────────────────────────────────────────────────`
- `69: DSEmptyState, DSErrorState,`
- `70: type DSEmptyStateProps, type DSErrorStateProps, type ErrorStateType,`
- `71: } from './components/States';`
### payment_insurance_relevance
- `5: *   import { DSButton, DSText, DSCard, ... } from '@/design-system';`
- `41: // ── Card ─────────────────────────────────────────────────────────────────────`
- `43: DSCard,`
- `44: type DSCardProps, type CardVariant, type CardSize,`
- `45: } from './components/Card';`
- `63: DSSkeletonCard, DSSkeletonListItem,`
### error_empty_loading_retry_cancel
- `60: // ── Loading / Skeleton ────────────────────────────────────────────────────────`
- `62: DSSpinner, DSLoadingOverlay, DSSkeleton,`
- `63: DSSkeletonCard, DSSkeletonListItem,`
- `64: type DSSpinnerProps, type DSLoadingOverlayProps, type DSSkeletonProps,`
- `65: } from './components/Loading';`
- `69: DSEmptyState, DSErrorState,`
- `70: type DSEmptyStateProps, type DSErrorStateProps, type ErrorStateType,`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
