# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/wallet/transfer.tsx`
- **Member SHA-256:** `23db9eeab19a6c00eab740e2d587e71fb1ae5de372c036645ca85d36ab5aeb28`
- **Line count:** 200
- **Read range:** `1-200`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router } from "expo-router";`
- `20: export default function Screen() {`
- `36: { text: "إلغاء", style: "cancel" },`
- `39: onPress: (recipient) => {`
- `48: { text: "إلغاء", style: "cancel" },`
- `51: onPress: async (amountStr) => {`
- `102: onPress={() => router.back()}`
- `131: onPress={() => handleTransfer("family")}`
- `150: onPress={() => handleTransfer("doctor")}`
### backend_consumers_or_contracts
- `2: // app/wallet/transfer.tsx — Premium redesign`
- `26: apiFetch<{ balance: number }>("/wallet/balance")`
- `62: const res: any = await apiFetch("/wallet/transfer", {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useState, useEffect } from "react";`
- `4: import { View, StyleSheet, ScrollView, StatusBar, Alert } from "react-native";`
- `23: const [balance, setBalance] = useState(0);`
- `36: { text: "إلغاء", style: "cancel" },`
- `48: { text: "إلغاء", style: "cancel" },`
- `91: <StatusBar barStyle="light-content" />`
### payment_insurance_relevance
- `2: // app/wallet/transfer.tsx — Premium redesign`
- `12: Card,`
- `26: apiFetch<{ balance: number }>("/wallet/balance")`
- `62: const res: any = await apiFetch("/wallet/transfer", {`
- `105: <View style={st.balanceCard}>`
- `130: <Card`
- `148: </Card>`
- `149: <Card`
- `167: </Card>`
- `187: balanceCard: {`
### error_empty_loading_retry_cancel
- `28: .catch(() => {});`
- `36: { text: "إلغاء", style: "cancel" },`
- `48: { text: "إلغاء", style: "cancel" },`
- `71: } catch (e) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
