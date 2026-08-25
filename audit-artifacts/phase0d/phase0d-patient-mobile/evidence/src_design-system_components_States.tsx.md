# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/design-system/components/States.tsx`
- **Member SHA-256:** `6a1b30de8593cba853ed9df9c35b0829b8a85926d8fa9fa86fe4b689ba15b837`
- **Line count:** 244
- **Read range:** `1-244`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `91: onPress={onAction}`
- `99: onPress={onSecondaryAction}`
- `120: onRetry?: () => void;`
- `140: onRetry,`
- `181: {onRetry && (`
- `184: onPress={onRetry}`
- `194: onPress={onBack}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `8: import { Spacing, BorderRadius } from '../tokens';`
- `46: accessibilityRole="text"`
- `114: export type ErrorStateType = 'generic' | 'network' | 'not_found' | 'permission' | 'server';`
- `132: permission: { icon: 'lock', defaultTitle: 'غير مصرح لك', defaultDesc: 'ليس لديك صلاحية الوصول لهذا المحتوى' },`
- `151: accessibilityRole="alert"`
- `186: icon="refresh"`
### state_transitions
- `2: * DS EmptyState + ErrorState — Premium states for empty data`
- `3: * and error conditions. No emojis — only SVG icons.`
- `14: // Empty State`
- `16: export interface DSEmptyStateProps {`
- `28: export function DSEmptyState({`
- `38: }: DSEmptyStateProps) {`
- `112: // Error State`
- `114: export type ErrorStateType = 'generic' | 'network' | 'not_found' | 'permission' | 'server';`
- `116: export interface DSErrorStateProps {`
- `117: type?: ErrorStateType;`
- `120: onRetry?: () => void;`
- `125: const ERROR_CONFIG: Record<`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `2: * DS EmptyState + ErrorState — Premium states for empty data`
- `3: * and error conditions. No emojis — only SVG icons.`
- `14: // Empty State`
- `16: export interface DSEmptyStateProps {`
- `28: export function DSEmptyState({`
- `38: }: DSEmptyStateProps) {`
- `112: // Error State`
- `114: export type ErrorStateType = 'generic' | 'network' | 'not_found' | 'permission' | 'server';`
- `116: export interface DSErrorStateProps {`
- `117: type?: ErrorStateType;`
- `120: onRetry?: () => void;`
- `125: const ERROR_CONFIG: Record<`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
