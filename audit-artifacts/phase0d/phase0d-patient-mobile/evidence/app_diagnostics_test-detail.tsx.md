# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/diagnostics/test-detail.tsx`
- **Member SHA-256:** `d2b802f4b9c76c90eaf533795bf692e356ca5ff597448749989536ae13983cf2`
- **Line count:** 178
- **Read range:** `1-178`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { useRouter, useLocalSearchParams, Stack } from 'expo-router';`
- `18: const router = useRouter();`
- `52: <Stack.Screen options={{ headerShown: false }} />`
- `56: <TouchableOpacity onPress={() => setIsFavorite(!isFavorite)}>`
- `63: <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>`
- `138: onPress={() => addItem({ id, name: testData.name, price: parseInt(testData.price), kind: isRadiology ? 'radiology' : 'lab' })}`
- `150: onPress={() => {`
- `152: router.push('/diagnostics/cart' as any);`
### backend_consumers_or_contracts
- `38: const endpoint = isRadiology ? `/radiology/services/${id}` : `/labs/services/${id}`;`
- `39: apiFetch(endpoint)`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useEffect, useState } from 'react';`
- `3: import { StyleSheet, View, Text, TouchableOpacity, ScrollView, FlatList, TextInput, Image, ActivityIndicator, Platform, Alert, StatusBar, KeyboardAvoidingView, Modal, I18nManager, Dimensions } from 'react-native';`
- `27: const [testData, setTestData] = useState<any>(null);`
- `28: const [isFavorite, setIsFavorite] = useState(false);`
- `29: const [loading, setLoading] = useState(true);`
- `41: .catch(console.error)`
- `42: .finally(() => setLoading(false));`
- `45: if (loading) return <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' } ]}><AppText>جاري التحميل...</AppText></SafeAreaView>;`
### payment_insurance_relevance
- `21: // Cards pass isRadiology=true; search passes type=radiology — accept both`
- `69: {/* Hero: the real catalogue image, large — same one shown on the card */}`
- `84: <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border } ]}>`
- `92: <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 } ]}>`
- `132: <AppText style={{ fontSize: 24, fontWeight: '900', color: colors.primary }}>{testData.price} <AppText style={{ fontSize: 14, color: colors.primary }}>ر.س</AppText></AppText>`
- `138: onPress={() => addItem({ id, name: testData.name, price: parseInt(testData.price), kind: isRadiology ? 'radiology' : 'lab' })}`
- `151: if (!inCart) addItem({ id, name: testData.name, price: parseInt(testData.price), kind: isRadiology ? 'radiology' : 'lab' });`
- `173: card: { padding: 20, borderRadius: 16, borderWidth: 1 },`
### error_empty_loading_retry_cancel
- `29: const [loading, setLoading] = useState(true);`
- `41: .catch(console.error)`
- `42: .finally(() => setLoading(false));`
- `45: if (loading) return <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' } ]}><AppText>جاري التحميل...</AppText></SafeAreaView>;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
