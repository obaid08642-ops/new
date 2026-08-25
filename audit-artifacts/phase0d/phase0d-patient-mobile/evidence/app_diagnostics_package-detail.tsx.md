# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/diagnostics/package-detail.tsx`
- **Member SHA-256:** `11aa30c1c77fd422fb393e0814faf1131fc2d1c6995e885175d6242ebeee0390`
- **Line count:** 163
- **Read range:** `1-163`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { useRouter, useLocalSearchParams, Stack } from 'expo-router';`
- `17: const router = useRouter();`
- `45: <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}><AppText style={{ color: colors.primary }}>العودة</AppText></TouchableOpacity>`
- `54: <Stack.Screen options={{ headerShown: false }} />`
- `59: <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>`
- `138: onPress={() => addItem({ id, name: pkg.name, price: parseInt(pkg.price), kind: 'lab' })}`
### backend_consumers_or_contracts
- `27: apiFetch(`/labs/packages/${id}`)`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useEffect, useState } from 'react';`
- `3: import { StyleSheet, View, Text, TouchableOpacity, ScrollView, FlatList, TextInput, Image, ActivityIndicator, Platform, Alert, StatusBar, KeyboardAvoidingView, Modal, I18nManager, Dimensions } from 'react-native';`
- `23: const [pkg, setPkg] = useState<any>(null);`
- `24: const [loading, setLoading] = useState(true);`
- `29: .catch(console.error)`
- `30: .finally(() => setLoading(false));`
- `33: if (loading) {`
### payment_insurance_relevance
- `65: <Animated.View entering={FadeInUp.duration(400).delay(100)} style={[styles.headerCard, { backgroundColor: pkg.color ? `${pkg.color}15` : `${colors.primary}15` }]} >`
- `128: {pkg.oldPrice && <AppText style={{ fontSize: 14, color: colors.textSecondary, textDecorationLine: 'line-through', marginBottom: 2 }}>{pkg.oldPrice} ر.س</AppText>}`
- `129: <AppText style={{ fontSize: 24, fontWeight: '900', color: colors.primary }}>{pkg.price} <AppText style={{ fontSize: 14, color: colors.primary }}>ر.س</AppText></AppText>`
- `132: <AppText style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: 12 }}>وفر {pkg.oldPrice ? (parseInt(pkg.oldPrice) - parseInt(pkg.price)) : 0} ر.س</AppText>`
- `138: onPress={() => addItem({ id, name: pkg.name, price: parseInt(pkg.price), kind: 'lab' })}`
- `156: headerCard: { padding: 24, borderRadius: 24, alignItems: 'center' },`
### error_empty_loading_retry_cancel
- `24: const [loading, setLoading] = useState(true);`
- `29: .catch(console.error)`
- `30: .finally(() => setLoading(false));`
- `33: if (loading) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
