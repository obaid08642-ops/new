# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/payments/failed.tsx`
- **Member SHA-256:** `1858c4beb96f631fda1c14696db4bc195322f6bae6d9e3610cb4f2e6de442ade`
- **Line count:** 158
- **Read range:** `1-158`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router, useLocalSearchParams } from "expo-router";`
- `18: export default function PaymentFailedScreen() {`
- `60: onPress={() => router.back()}`
- `63: <View style={styles.retryBtn}>`
- `77: onPress={() => router.push("/wallet/hub")}`
- `82: <TouchableOpacity onPress={() => router.replace("/(tabs)")}>`
- `142: retryBtn: {`
- `148: retryBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },`
- `157: cancelLink: { fontSize: 13, fontWeight: "400", textAlign: "center" },`
### backend_consumers_or_contracts
- `77: onPress={() => router.push("/wallet/hub")}`
### auth_ownership
- `71: <Icon name="refresh" size={16} color={colors.primary} />`
### state_transitions
- `2: // app/payments/failed.tsx`
- `18: export default function PaymentFailedScreen() {`
- `33: <View style={styles.failedIcon}>`
- `34: <Icon name="error" size={20} color={colors.primary} />`
- `63: <View style={styles.retryBtn}>`
- `98: failedIcon: {`
- `108: failedTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },`
- `109: failedAmount: {`
- `114: failedSub: {`
- `142: retryBtn: {`
- `148: retryBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },`
- `157: cancelLink: { fontSize: 13, fontWeight: "400", textAlign: "center" },`
### payment_insurance_relevance
- `2: // app/payments/failed.tsx`
- `12: Card,`
- `18: export default function PaymentFailedScreen() {`
- `45: styles.card,`
- `77: onPress={() => router.push("/wallet/hub")}`
- `78: style={[styles.walletBtn, { borderColor: colors.border }]}`
- `119: card: {`
- `129: cardTitle: {`
- `149: walletBtn: {`
- `156: walletBtnText: { fontSize: 14, fontWeight: "700" },`
### error_empty_loading_retry_cancel
- `2: // app/payments/failed.tsx`
- `18: export default function PaymentFailedScreen() {`
- `33: <View style={styles.failedIcon}>`
- `34: <Icon name="error" size={20} color={colors.primary} />`
- `63: <View style={styles.retryBtn}>`
- `98: failedIcon: {`
- `108: failedTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },`
- `109: failedAmount: {`
- `114: failedSub: {`
- `142: retryBtn: {`
- `148: retryBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },`
- `157: cancelLink: { fontSize: 13, fontWeight: "400", textAlign: "center" },`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
