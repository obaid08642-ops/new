# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/payments/failure.tsx`
- **Member SHA-256:** `f71575e839c6550c8f0a51538ac6f7e24564678c79c04eb34919fb5b4d1a5503`
- **Line count:** 102
- **Read range:** `1-102`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router } from "expo-router";`
- `10: export default function PaymentFailureScreen() {`
- `66: onPress={() => router.back()}`
- `72: onPress={() => router.back()}`
- `78: onPress={() => router.replace("/(tabs)")}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `65: icon="refresh"`
### state_transitions
- `3: import { View, StyleSheet, StatusBar } from "react-native";`
- `21: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
- `23: <View style={[st.iconWrap, { backgroundColor: colors.errorSurface }]}>`
- `24: <Icon name="close" size={48} color={colors.error} />`
- `26: <AppText variant="h3" align="center" color={colors.error}>`
### payment_insurance_relevance
- `8: import { AppText, Card, Button } from "../../src/components/ui";`
- `10: export default function PaymentFailureScreen() {`
- `34: <Card style={{ width: "100%", gap: 8 }}>`
- `59: </Card>`
- `71: icon="card"`
### error_empty_loading_retry_cancel
- `23: <View style={[st.iconWrap, { backgroundColor: colors.errorSurface }]}>`
- `24: <Icon name="close" size={48} color={colors.error} />`
- `26: <AppText variant="h3" align="center" color={colors.error}>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
