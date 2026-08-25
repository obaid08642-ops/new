# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/insurance/policy-detail.tsx`
- **Member SHA-256:** `4ae02f4acd367d41f60605d380fd69249605f0ceadb40d1572d198acceffb5b0`
- **Line count:** 175
- **Read range:** `1-175`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router, useLocalSearchParams } from "expo-router";`
- `17: export default function PolicyDetailScreen() {`
- `51: <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>`
- `71: <TouchableOpacity onPress={() => router.push('/insurance/add-policy')}>`
- `107: onPress={() => router.push("/insurance/coverage-check")}`
### backend_consumers_or_contracts
- `24: apiFetch('/users/me/profile')`
- `71: <TouchableOpacity onPress={() => router.push('/insurance/add-policy')}>`
- `107: onPress={() => router.push("/insurance/coverage-check")}`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useEffect, useState } from "react";`
- `20: const [policy, setPolicy] = useState<any>(null);`
- `21: const [loading, setLoading] = useState(true);`
- `27: .finally(() => setLoading(false));`
- `67: {!loading && !policy && (`
### payment_insurance_relevance
- `10: Card,`
- `25: .then((p: any) => setPolicy(p?.insurance || null))`
- `71: <TouchableOpacity onPress={() => router.push('/insurance/add-policy')}>`
- `79: styles.card,`
- `107: onPress={() => router.push("/insurance/coverage-check")}`
- `159: card: { borderRadius: 18, padding: 14 },`
### error_empty_loading_retry_cancel
- `21: const [loading, setLoading] = useState(true);`
- `26: .catch(() => setPolicy(null))`
- `27: .finally(() => setLoading(false));`
- `67: {!loading && !policy && (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
