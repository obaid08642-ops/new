# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/components/animations.tsx`
- **Member SHA-256:** `f7f6f0fd4d0faadcf8291ca5a73331944acdea24b46ba8f85fcbe46bb6053f53`
- **Line count:** 245
- **Read range:** `1-245`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `69: // Shimmer Loading Placeholder`
- `141: // Pulse Ring Animation (for broadcast/searching states)`
### payment_insurance_relevance
- `119: interface SkeletonCardProps {`
- `123: export function SkeletonCard({ count = 3 }: SkeletonCardProps) {`
- `127: <View key={i} style={styles.skeletonCard}>`
- `222: skeletonCard: {`
### error_empty_loading_retry_cancel
- `69: // Shimmer Loading Placeholder`
- `116: // Skeleton Loader for lists`
- `119: interface SkeletonCardProps {`
- `123: export function SkeletonCard({ count = 3 }: SkeletonCardProps) {`
- `125: <View style={styles.skeletonContainer}>`
- `127: <View key={i} style={styles.skeletonCard}>`
- `129: <View style={styles.skeletonLines}>`
- `163: setTimeout(() => {`
- `218: skeletonContainer: {`
- `222: skeletonCard: {`
- `230: skeletonLines: {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
