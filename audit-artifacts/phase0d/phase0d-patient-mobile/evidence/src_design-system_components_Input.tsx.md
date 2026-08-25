# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/design-system/components/Input.tsx`
- **Member SHA-256:** `80f18ec738de71a1d8907da2e68f4707e829f7f2a15fb50a4871cb1497e7c7e2`
- **Line count:** 239
- **Read range:** `1-239`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `29: onRightIconPress?: () => void;`
- `50: onRightIconPress,`
- `82: const handleRightIconPress = isPassword ? togglePassword : onRightIconPress;`
- `155: onPress={handleRightIconPress}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `11: import { Spacing, BorderRadius } from '../tokens';`
- `157: accessibilityRole="button"`
### state_transitions
- `2: * DS Input — All input variants with validation states,`
- `5: import React, { useState, useRef, useCallback, forwardRef } from 'react';`
- `19: export type InputState = 'default' | 'focused' | 'error' | 'success' | 'disabled';`
- `30: error?: string;`
- `51: error,`
- `62: const [isFocused, setIsFocused] = useState(false);`
- `63: const [showPassword, setShowPassword] = useState(false);`
- `65: const inputState: InputState = disabled`
- `67: : error`
- `68: ? 'error'`
- `73: const borderColor = getBorderColor(inputState, colors);`
- `93: <DSText variant="labelMD" color={colors.error} style={{ marginHorizontal: 2 }}>`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `19: export type InputState = 'default' | 'focused' | 'error' | 'success' | 'disabled';`
- `30: error?: string;`
- `51: error,`
- `67: : error`
- `68: ? 'error'`
- `93: <DSText variant="labelMD" color={colors.error} style={{ marginHorizontal: 2 }}>`
- `170: {/* Error / Hint */}`
- `171: {error ? (`
- `173: <Icon name="error_outline" size={13} color={colors.error} />`
- `176: color={colors.error}`
- `179: {error}`
- `197: case 'error':    return colors.error;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
