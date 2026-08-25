# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/settings/terms.tsx`
- **Member SHA-256:** `80b467688976e2c7c11c5190aa7dd3e52142e3781ede56b0b2260309e12bceea`
- **Line count:** 196
- **Read range:** `1-196`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router } from "expo-router";`
- `60: export default function TermsScreen() {`
- `80: <IconButton icon="back" onPress={() => router.back()} />`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import { View, StyleSheet, ScrollView, StatusBar } from "react-native";`
- `66: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
### payment_insurance_relevance
- `9: import { AppText, Card, IconButton } from "../../src/components/ui";`
- `45: icon: "cash",`
- `107: <Card style={styles.sectionCard}>`
- `131: </Card>`
- `175: sectionCard: {`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
