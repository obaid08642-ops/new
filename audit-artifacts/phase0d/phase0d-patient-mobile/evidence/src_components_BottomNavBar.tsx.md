# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/components/BottomNavBar.tsx`
- **Member SHA-256:** `af48ca5d99e729816ceba7e61cfe90a44f81127639b9d0495f899ef7de2d2398`
- **Line count:** 172
- **Read range:** `1-172`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router, usePathname } from 'expo-router';`
- `28: const handlePress = (screen: any) => {`
- `30: router.push(screen);`
- `36: { icon: 'home', label: bottomNavLabel(lang, 'home'), screen: '/(tabs)' },`
- `37: { icon: 'prescriptions', label: bottomNavLabel(lang, 'pharmacy'), screen: '/(tabs)/pharmacy' },`
- `38: { icon: 'stethoscope', label: bottomNavLabel(lang, 'consultations'), screen: '/(tabs)/consultations', isFab: true },`
- `39: { icon: 'science', label: bottomNavLabel(lang, 'diagnostics'), screen: '/(tabs)/diagnostics' },`
- `40: { icon: 'healing', label: bottomNavLabel(lang, 'nursing'), screen: '/(tabs)/nursing' },`
- `64: onPress={() => handlePress(item.screen)}`
- `86: onPress={() => handlePress(item.screen)}`
### backend_consumers_or_contracts
- `20: if (pathname.includes('/pharmacy')) return 1;`
- `23: if (pathname.includes('/nursing')) return 4;`
- `37: { icon: 'prescriptions', label: bottomNavLabel(lang, 'pharmacy'), screen: '/(tabs)/pharmacy' },`
- `40: { icon: 'healing', label: bottomNavLabel(lang, 'nursing'), screen: '/(tabs)/nursing' },`
### auth_ownership
- `65: accessibilityRole="tab"`
- `87: accessibilityRole="tab"`
### state_transitions
- `67: accessibilityState={{ selected: activeTab === idx }}`
- `89: accessibilityState={{ selected: isActive }}`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
