# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/home-visit-tracking.tsx`
- **Member SHA-256:** `ff6376027519af5abed1e210859a3f44a66489964f9d35702fa21913ee56220c`
- **Line count:** 129
- **Read range:** `1-129`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router, useLocalSearchParams } from 'expo-router';`
- `11: export default function HomeVisitTrackingScreen() {`
- `37: <TouchableOpacity style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#F0695C', borderRadius: 10 }} onPress={() => router.back()}>`
- `50: <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, justifyContent: 'center' }}>`
- `104: onPress={() => {`
- `107: router.push({ pathname: '/consultations/chat-with-doctor', params: { doctorId } });`
### backend_consumers_or_contracts
- `23: apiFetch(`/care/appointments/${appointmentId}`)`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useEffect, useState } from 'react';`
- `3: import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';`
- `18: const [loading, setLoading] = useState(true);`
- `19: const [data, setData] = useState<any>(null);`
- `24: .then((res: any) => { setData(res?.data || res); setLoading(false); })`
- `25: .catch(() => { setData(null); setLoading(false); });`
- `27: setData(null); setLoading(false);`
- `32: if (!loading && !data) {`
- `35: <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 50, color: colors.t3 }}>error_outline</LocalizedText>`
- `43: if (loading) return <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center' } ]}><ActivityIndicator color={resolveColor('var(--p)')} /></View>;`
- `47: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
- `85: { label: 'الطبيب في الطريق', active: data?.status === 'الطبيب في الطريق' || data?.status === 'وصل لموقعك', icon: 'check' },`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `18: const [loading, setLoading] = useState(true);`
- `24: .then((res: any) => { setData(res?.data || res); setLoading(false); })`
- `25: .catch(() => { setData(null); setLoading(false); });`
- `27: setData(null); setLoading(false);`
- `32: if (!loading && !data) {`
- `35: <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 50, color: colors.t3 }}>error_outline</LocalizedText>`
- `43: if (loading) return <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center' } ]}><ActivityIndicator color={resolveColor('var(--p)')} /></View>;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
