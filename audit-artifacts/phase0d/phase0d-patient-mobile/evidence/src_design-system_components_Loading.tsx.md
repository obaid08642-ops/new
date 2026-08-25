# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/design-system/components/Loading.tsx`
- **Member SHA-256:** `56305af5efcf192544ef69132c759c169f0b42b14badb152797bed994d0f7905`
- **Line count:** 203
- **Read range:** `1-203`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: * DS Loading + Skeleton — Activity indicators and skeleton screens`
- `37: // DS Loading Overlay — Full screen or section loader`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `11: import { BorderRadius, Spacing } from '../tokens';`
### state_transitions
- `2: * DS Loading + Skeleton — Activity indicators and skeleton screens`
- `3: * for every loading state in the app.`
- `37: // DS Loading Overlay — Full screen or section loader`
- `39: export interface DSLoadingOverlayProps {`
- `45: export function DSLoadingOverlay({ visible, message, overlay = false }: DSLoadingOverlayProps) {`
- `52: styles.loadingOverlay,`
- `63: <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>`
- `76: // DS Skeleton — Shimmer placeholder for content loading`
- `143: // Skeleton presets — Common loading patterns`
- `192: loadingOverlay: {`
- `197: loadingCard: {`
### payment_insurance_relevance
- `63: <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>`
- `146: /** Profile/doctor card skeleton */`
- `147: export function DSSkeletonCard({ style }: { style?: StyleProp<ViewStyle> }) {`
- `197: loadingCard: {`
### error_empty_loading_retry_cancel
- `2: * DS Loading + Skeleton — Activity indicators and skeleton screens`
- `3: * for every loading state in the app.`
- `15: // DS Spinner — Simple activity indicator`
- `17: export interface DSSpinnerProps {`
- `23: export function DSSpinner({ size = 'small', color, style }: DSSpinnerProps) {`
- `37: // DS Loading Overlay — Full screen or section loader`
- `39: export interface DSLoadingOverlayProps {`
- `45: export function DSLoadingOverlay({ visible, message, overlay = false }: DSLoadingOverlayProps) {`
- `52: styles.loadingOverlay,`
- `63: <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>`
- `76: // DS Skeleton — Shimmer placeholder for content loading`
- `78: export interface DSSkeletonProps {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
