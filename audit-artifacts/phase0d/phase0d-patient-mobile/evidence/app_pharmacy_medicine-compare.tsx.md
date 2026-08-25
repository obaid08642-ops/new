# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/pharmacy/medicine-compare.tsx`
- **Member SHA-256:** `04d486c9fc00314543f00b43212bb0e9d57e3926dd1b7c7c28f43af1538ed419`
- **Line count:** 143
- **Read range:** `1-143`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router } from 'expo-router';`
- `11: import { useLocalSearchParams } from 'expo-router';`
- `25: export default function MedicineCompareScreen() {`
- `59: <TouchableOpacity onPress={() => router.back()}>`
- `113: onPress={() => { /* Requires backend API integration */ }}>`
### backend_consumers_or_contracts
- `37: const data = await apiFetch('/medicines/compare', 'POST', { ids });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState } from 'react';`
- `3: import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';`
- `30: const [medicines, setMedicines] = useState<any[]>([]);`
- `31: const [loading, setLoading] = useState(true);`
- `40: console.error(err);`
- `42: setLoading(false);`
- `56: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
### payment_insurance_relevance
- `8: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `19: { label: 'السعر', key: 'price', icon: 'wallet', suffix: ' ريال' },`
- `49: if (key === 'price') return (medicines[0].price || 0) < (medicines[1].price || 0) ? 0 : 1;`
### error_empty_loading_retry_cancel
- `31: const [loading, setLoading] = useState(true);`
- `39: } catch (err) {`
- `40: console.error(err);`
- `42: setLoading(false);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
