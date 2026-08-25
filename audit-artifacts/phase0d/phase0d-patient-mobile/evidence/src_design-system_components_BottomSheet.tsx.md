# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/design-system/components/BottomSheet.tsx`
- **Member SHA-256:** `6d745a30db24b79308a2b5c6639eb916ee4d7a51a40f22f685d7141c45594f18`
- **Line count:** 239
- **Read range:** `1-239`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `17: const { height: SCREEN_HEIGHT } = Dimensions.get('window');`
- `27: /** Max height as fraction of screen (0.3 → 0.95) */`
- `55: const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;`
- `58: const maxHeight = SCREEN_HEIGHT * maxHeightFactor;`
- `80: toValue: SCREEN_HEIGHT,`
- `99: translateY.setValue(SCREEN_HEIGHT);`
- `147: onPress={closeOnBackdropPress ? () => close() : undefined}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `14: import { Spacing, BorderRadius, Shadows } from '../tokens';`
- `178: accessibilityRole="button"`
### state_transitions
- `107: onMoveShouldSetPanResponder: (_, gestureState) =>`
- `108: gestureState.dy > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),`
- `109: onPanResponderMove: (_, gestureState) => {`
- `110: if (gestureState.dy > 0) {`
- `111: translateY.setValue(gestureState.dy);`
- `114: onPanResponderRelease: (_, gestureState) => {`
- `115: if (gestureState.dy > 120 || gestureState.vy > 0.5) {`
- `139: statusBarTranslucent`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
