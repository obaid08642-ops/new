# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(onboarding)/index.tsx`
- **Member SHA-256:** `3255dd8d3c3851a5b8a1cf2814425354b51fde4e13779c2fb68aa93ca5311b4c`
- **Line count:** 314
- **Read range:** `1-314`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { router } from 'expo-router';`
- `64: export default function OnboardingScreen() {`
- `87: router.replace('/(onboarding)/language');`
- `97: router.replace('/(onboarding)/language');`
- `167: <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>`
- `202: <TouchableOpacity onPress={handleNext} activeOpacity={0.85}>`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useRef, useState, useCallback } from 'react';`
- `6: FlatList, Animated, StatusBar, Platform,`
- `67: const [currentIndex, setCurrentIndex] = useState(0);`
- `136: <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />`
### payment_insurance_relevance
- `16: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
### error_empty_loading_retry_cancel
- `81: } catch (e) {`
- `84: } catch (e) {`
- `94: } catch (e) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
