# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/insurance/benefits-summary.tsx`
- **Member SHA-256:** `f5f31213f8f5a8aba005d0245afce88e7d665377660ca08e3b047543ba43f904`
- **Line count:** 162
- **Read range:** `1-162`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router } from 'expo-router';`
- `13: export default function BenefitsSummaryScreen() {`
- `34: <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>`
### backend_consumers_or_contracts
- `2: // app/insurance/benefits-summary.tsx`
- `21: apiFetch('/insurance/benefits-summary')`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `17: const [benefits, setBenefits] = React.useState<any[]>([]);`
### payment_insurance_relevance
- `2: // app/insurance/benefits-summary.tsx`
- `9: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `21: apiFetch('/insurance/benefits-summary')`
- `27: const totalUsed = benefits.reduce((s, b) => s + b.usedAmount, 0);`
- `28: const totalLimit = 500000;`
- `40: <View style={styles.totalCard}>`
- `41: <View style={styles.totalRight}>`
- `43: <AppText variant="h5" color="#fff">{(totalLimit / 1000).toFixed(0)}k ريال</AppText>`
- `45: <View style={styles.totalDivider} />`
- `46: <View style={styles.totalLeft}>`
- `48: <AppText variant="h5" color="#fff">{((totalLimit - totalUsed) / 1000).toFixed(0)}k</AppText>`
- `50: <View style={styles.totalDivider} />`
### error_empty_loading_retry_cancel
- `23: .catch(() => {});`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
