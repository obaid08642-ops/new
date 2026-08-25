# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/design-system/components/Card.tsx`
- **Member SHA-256:** `7b976066e250cd1cc92e64c367ca32fdf7e4d0e0f9e6ec45b18ae197d2b61267`
- **Line count:** 164
- **Read range:** `1-164`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `25: onPress?: () => void;`
- `51: onPress,`
- `93: return onPress ? (`
- `95: onPress={() => { Haptics.selectionAsync(); onPress(); }}`
- `111: if (onPress) {`
- `114: onPress={() => { Haptics.selectionAsync(); onPress(); }}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `13: import { BorderRadius, Spacing, Shadows } from '../tokens';`
- `98: accessibilityRole="button"`
- `117: accessibilityRole="button"`
### state_transitions
- `2: * DS Card — Reusable card container with elevation, press state,`
### payment_insurance_relevance
- `2: * DS Card — Reusable card container with elevation, press state,`
- `18: export type CardVariant = 'default' | 'elevated' | 'outlined' | 'flat' | 'gradient';`
- `19: export type CardSize   = 'sm' | 'md' | 'lg';`
- `21: export interface DSCardProps {`
- `23: variant?: CardVariant;`
- `24: size?: CardSize;`
- `38: const PADDING: Record<CardSize, number> = {`
- `47: export function DSCard({`
- `58: }: DSCardProps) {`
- `136: function getVariantStyle(variant: CardVariant, colors: any): ViewStyle {`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
