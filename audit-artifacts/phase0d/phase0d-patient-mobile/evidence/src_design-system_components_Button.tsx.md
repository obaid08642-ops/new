# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/design-system/components/Button.tsx`
- **Member SHA-256:** `d022c43f8464d126b90b3884c9a84c79c35390d38cf08e07ea25bfbffdc7f9f2`
- **Line count:** 266
- **Read range:** `1-266`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `34: onPress?: () => void;`
- `63: onPress,`
- `82: onPress?.();`
- `83: }, [onPress, noHaptics]);`
- `110: onPress={handlePress}`
- `144: onPress={handlePress}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `13: import { Spacing, BorderRadius, Gradients, Animation } from '../tokens';`
- `114: accessibilityRole="button"`
- `148: accessibilityRole="button"`
### state_transitions
- `2: * DS Button — All button variants with haptics, loading state,`
- `26: | 'success'`
- `39: loading?: boolean;`
- `68: loading = false,`
- `85: const isDisabled = disabled || loading;`
- `117: accessibilityState={{ disabled: isDisabled, busy: loading }}`
- `128: loading={loading}`
- `151: accessibilityState={{ disabled: isDisabled, busy: loading }}`
- `160: loading={loading}`
- `177: label, loading, icon, iconPosition,`
- `180: label: string; loading: boolean; icon?: IconName;`
- `186: if (loading) {`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `2: * DS Button — All button variants with haptics, loading state,`
- `39: loading?: boolean;`
- `68: loading = false,`
- `85: const isDisabled = disabled || loading;`
- `117: accessibilityState={{ disabled: isDisabled, busy: loading }}`
- `128: loading={loading}`
- `151: accessibilityState={{ disabled: isDisabled, busy: loading }}`
- `160: loading={loading}`
- `177: label, loading, icon, iconPosition,`
- `180: label: string; loading: boolean; icon?: IconName;`
- `186: if (loading) {`
- `243: container: { backgroundColor: colors.error },`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
