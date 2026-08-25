# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/offers/index.tsx`
- **Member SHA-256:** `871f6b5c12f74085f1a0d910807cf54752e02e4f16fb390a4f56342d076d437e`
- **Line count:** 96
- **Read range:** `1-96`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { useRouter } from 'expo-router';`
- `12: export default function OffersListScreen() {`
- `13: const router = useRouter();`
- `40: <IconButton icon="back" onPress={() => router.back()} />`
- `54: {loadError && <AppText variant="labelMD" color={colors.primary} onPress={load}>إعادة المحاولة</AppText>}`
- `59: <TouchableOpacity key={o.id || i} activeOpacity={0.85} onPress={() => o.id && router.push(`/offers/${o.id}`)}>`
### backend_consumers_or_contracts
- `23: apiFetch('/home/offers')`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useState, useEffect } from 'react';`
- `4: import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';`
- `16: const [offers, setOffers] = useState<any[]>([]);`
- `17: const [loading, setLoading] = useState(true);`
- `18: const [loadError, setLoadError] = useState(false);`
- `21: setLoading(true);`
- `22: setLoadError(false);`
- `28: .catch(() => { setOffers([]); setLoadError(true); })`
- `29: .finally(() => setLoading(false));`
- `36: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
- `43: {loading ? (`
- `50: <AppText variant="h5" align="center">{loadError ? 'تعذر تحميل العروض' : 'لا توجد عروض متاحة حالياً'}</AppText>`
### payment_insurance_relevance
- `2: // app/offers/index.tsx — كل العروض والباقات النشطة`
- `9: import { AppText, Card, Badge, IconButton } from '../../src/components/ui';`
- `12: export default function OffersListScreen() {`
- `16: const [offers, setOffers] = useState<any[]>([]);`
- `23: apiFetch('/home/offers')`
- `26: setOffers(Array.isArray(list) ? list : []);`
- `28: .catch(() => { setOffers([]); setLoadError(true); })`
- `47: ) : offers.length === 0 ? (`
- `58: {offers.map((o: any, i: number) => (`
- `59: <TouchableOpacity key={o.id || i} activeOpacity={0.85} onPress={() => o.id && router.push(`/offers/${o.id}`)}>`
- `60: <Card style={{ gap: 8 }}>`
- `69: <AppText variant="h3" color={colors.primary}>{o.price} ر.س</AppText>`
### error_empty_loading_retry_cancel
- `17: const [loading, setLoading] = useState(true);`
- `18: const [loadError, setLoadError] = useState(false);`
- `21: setLoading(true);`
- `22: setLoadError(false);`
- `28: .catch(() => { setOffers([]); setLoadError(true); })`
- `29: .finally(() => setLoading(false));`
- `43: {loading ? (`
- `50: <AppText variant="h5" align="center">{loadError ? 'تعذر تحميل العروض' : 'لا توجد عروض متاحة حالياً'}</AppText>`
- `52: {loadError ? 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى' : 'تابعنا — تُضاف عروض جديدة باستمرار'}`
- `54: {loadError && <AppText variant="labelMD" color={colors.primary} onPress={load}>إعادة المحاولة</AppText>}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
