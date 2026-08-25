# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/design-system/components/SearchBar.tsx`
- **Member SHA-256:** `4be4dd2c12be6e1e76493b2a1670a66f4083b07af6044b1b663f8f02410e8213`
- **Line count:** 266
- **Read range:** `1-266`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `32: cancelable?: boolean;`
- `33: onCancel?: () => void;`
- `53: cancelable = false,`
- `54: onCancel,`
- `58: const [showCancel, setShowCancel] = useState(false);`
- `59: const cancelWidth = useRef(new Animated.Value(0)).current;`
- `72: if (cancelable) {`
- `73: setShowCancel(true);`
- `74: Animated.spring(cancelWidth, {`
- `81: }, [cancelable, cancelWidth]);`
- `85: if (cancelable && !value) {`
- `86: Animated.timing(cancelWidth, {`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `11: import { BorderRadius, Spacing } from '../tokens';`
- `173: accessibilityRole="button"`
- `185: accessibilityRole="button"`
- `203: accessibilityRole="button"`
- `220: accessibilityRole="button"`
### state_transitions
- `5: import React, { useState, useCallback, useRef, useEffect } from 'react';`
- `32: cancelable?: boolean;`
- `33: onCancel?: () => void;`
- `53: cancelable = false,`
- `54: onCancel,`
- `57: const [isFocused, setIsFocused] = useState(false);`
- `58: const [showCancel, setShowCancel] = useState(false);`
- `59: const cancelWidth = useRef(new Animated.Value(0)).current;`
- `72: if (cancelable) {`
- `73: setShowCancel(true);`
- `74: Animated.spring(cancelWidth, {`
- `81: }, [cancelable, cancelWidth]);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `32: cancelable?: boolean;`
- `33: onCancel?: () => void;`
- `53: cancelable = false,`
- `54: onCancel,`
- `58: const [showCancel, setShowCancel] = useState(false);`
- `59: const cancelWidth = useRef(new Animated.Value(0)).current;`
- `60: const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);`
- `72: if (cancelable) {`
- `73: setShowCancel(true);`
- `74: Animated.spring(cancelWidth, {`
- `81: }, [cancelable, cancelWidth]);`
- `85: if (cancelable && !value) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
