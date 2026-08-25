# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(auth)/provider-info.tsx`
- **Member SHA-256:** `381b300534513a6a17dd0813d7282e7ed5c3b516ec5434657e14e823736d2b20`
- **Line count:** 91
- **Read range:** `1-91`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router } from "expo-router";`
- `10: export default function ProviderInfoScreen() {`
- `15: router.replace("/(tabs)");`
- `18: const handleLogout = () => {`
- `19: router.replace("/(auth)/login");`
- `62: onPress={handleContinueAsPatient}`
- `65: <TouchableOpacity onPress={handleLogout} style={st.logoutBtn}>`
- `90: logoutBtn: { paddingVertical: 12 },`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `18: const handleLogout = () => {`
- `19: router.replace("/(auth)/login");`
- `65: <TouchableOpacity onPress={handleLogout} style={st.logoutBtn}>`
- `90: logoutBtn: { paddingVertical: 12 },`
### state_transitions
- `3: import { View, StyleSheet, StatusBar, TouchableOpacity } from "react-native";`
- `33: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
- `66: <AppText variant="labelMD" color={colors.error} align="center">`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `66: <AppText variant="labelMD" color={colors.error} align="center">`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
