# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/design-system/components/Badge.tsx`
- **Member SHA-256:** `7806fd038cf6e123f6e5cb1cf3476b4c7f8ef2c3cd6566ef0af7e58ce9e6e209`
- **Line count:** 246
- **Read range:** `1-246`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `99: onPress?: () => void;`
- `110: onPress,`
- `125: onPress={onPress}`
- `154: onPress={onRemove}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `12: import { BorderRadius, Spacing } from '../tokens';`
- `58: accessibilityRole="text"`
- `79: accessibilityRole="text"`
- `129: accessibilityRole="button"`
- `156: accessibilityRole="button"`
- `214: accessibilityRole="text"`
### state_transitions
- `53: backgroundColor: color ?? colors.error,`
- `71: backgroundColor: color ?? colors.error,`
- `130: accessibilityState={{ selected, disabled }}`
- `169: export type TagVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'custom';`
- `235: case 'success': return { bg: '#EBF6E9', text: colors.success };`
- `237: case 'error':   return { bg: '#FEF2F2', text: colors.error };`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `53: backgroundColor: color ?? colors.error,`
- `71: backgroundColor: color ?? colors.error,`
- `169: export type TagVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'custom';`
- `237: case 'error':   return { bg: '#FEF2F2', text: colors.error };`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
