# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/health/refills.tsx`
- **Member SHA-256:** `3dcadb43d62d56716943b81dfb8a44c50c062d1924fbcb98fdac4259cc8c3dfa`
- **Line count:** 203
- **Read range:** `1-203`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { useRouter } from 'expo-router';`
- `14: export default function ChronicRefillsHubScreen() {`
- `15: const router = useRouter();`
- `62: { text: 'إلغاء', style: 'cancel' },`
- `65: onPress: async () => {`
- `77: [{ text: 'تتبع الطلب', onPress: () => router.push({ pathname: '/pharmacy/order-tracking', params: tracking }) }, { text: 'حسناً', style: 'cancel' }],`
- `87: { text: 'إضافة عنوان', onPress: () => router.push('/profile/addresses') }, { text: 'إلغاء', style: 'cancel' },`
- `107: <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />`
- `130: <Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={loadRefills} />`
- `177: onPress={() => handleReorder(med.id)}`
### backend_consumers_or_contracts
- `27: apiFetch('/health/reminders?active=1')`
- `68: const res = await apiFetch(`/health/reminders/${id}/refill`, { method: 'POST' });`
- `77: [{ text: 'تتبع الطلب', onPress: () => router.push({ pathname: '/pharmacy/order-tracking', params: tracking }) }, { text: 'حسناً', style: 'cancel' }],`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useState } from 'react';`
- `4: import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';`
- `18: const [refills, setRefills] = useState<any[]>([]);`
- `19: const [loadingId, setLoadingId] = useState<string | null>(null);`
- `20: const [loading, setLoading] = useState(true);`
- `21: const [loadError, setLoadError] = useState(false);`
- `24: setLoading(true);`
- `25: setLoadError(false);`
- `48: .catch(() => setLoadError(true))`
- `49: .finally(() => setLoading(false));`
- `62: { text: 'إلغاء', style: 'cancel' },`
- `66: setLoadingId(id);`
### payment_insurance_relevance
- `9: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `40: totalDays: r.total_days ?? null,`
- `43: price: null, // price is resolved at order time by the pharmacy basket`
- `112: {/* Info advice card */}`
- `113: <Card style={[st.infoCard, { backgroundColor: colors.primarySurface, borderColor: colors.primary + '20' } ]}>`
- `121: </Card>`
- `127: <Card style={{ alignItems: 'center', gap: 8 }}>`
- `131: </Card>`
- `137: const showBar = hasDays && med.totalDays != null && med.totalDays > 0;`
- `138: const progressPct = showBar ? Math.min(100, (med.remainingDays / med.totalDays) * 100) : 0;`
- `142: <Card key={med.id} style={st.medCard}>`
- `170: <AppText variant="labelSM" color={colors.primary}>{med.price != null ? `${med.price} ر.س / علبة` : 'السعر يُحدد في سلة الصيدلية'}</AppText>`
### error_empty_loading_retry_cancel
- `19: const [loadingId, setLoadingId] = useState<string | null>(null);`
- `20: const [loading, setLoading] = useState(true);`
- `21: const [loadError, setLoadError] = useState(false);`
- `24: setLoading(true);`
- `25: setLoadError(false);`
- `48: .catch(() => setLoadError(true))`
- `49: .finally(() => setLoading(false));`
- `62: { text: 'إلغاء', style: 'cancel' },`
- `66: setLoadingId(id);`
- `69: setLoadingId(null);`
- `77: [{ text: 'تتبع الطلب', onPress: () => router.push({ pathname: '/pharmacy/order-tracking', params: tracking }) }, { text: 'حسناً', style: 'cancel' }],`
- `82: } catch (e: any) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
