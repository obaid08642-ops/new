# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/diagnostics/lab/[id].tsx`
- **Member SHA-256:** `74e9c7dcb803136279a4ef8f944de8afbe7fe0a033939d75d543312f5b919adb`
- **Line count:** 186
- **Read range:** `1-186`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { useRouter, useLocalSearchParams, Stack } from 'expo-router';`
- `15: const router = useRouter();`
- `55: <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>`
- `64: <Stack.Screen options={{ headerShown: false }} />`
- `69: <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>`
- `105: onPress={() => {`
- `136: onPress={() => (router.push as any)(`/diagnostics/test-detail?id=${test.id}&labId=${id}`)}`
- `154: onPress={() => addItem({ id: test.id, name: test.name, price: test.price, kind: 'lab', lockedProviderId: id as string })}`
### backend_consumers_or_contracts
- `28: apiFetch(`/providers/${id}`),`
- `29: apiFetch(`/labs/services?providerId=${id}`)`
### auth_ownership
- `29: apiFetch(`/labs/services?providerId=${id}`)`
- `131: const isAdded = items.some(item => item.id === test.id && (item.lockedProviderId === id || !item.lockedProviderId));`
- `154: onPress={() => addItem({ id: test.id, name: test.name, price: test.price, kind: 'lab', lockedProviderId: id as string })}`
### state_transitions
- `2: import React, { useState, useEffect } from 'react';`
- `3: import { StyleSheet, View, Text, TouchableOpacity, ScrollView, FlatList, TextInput, Image, ActivityIndicator, Platform, Alert, StatusBar, KeyboardAvoidingView, Modal, I18nManager, Dimensions, Linking } from 'react-native';`
- `20: const [lab, setLab] = useState<any>(null);`
- `21: const [tests, setTests] = useState<any[]>([]);`
- `22: const [loading, setLoading] = useState(true);`
- `34: console.error(err);`
- `35: // Fallback or handle error`
- `37: setLoading(false);`
- `43: if (loading) {`
### payment_insurance_relevance
- `143: <AppText style={{ fontSize: 16, fontWeight: '900', color: colors.primary, marginTop: 4, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>{test.price} ر.س</AppText>`
- `154: onPress={() => addItem({ id: test.id, name: test.name, price: test.price, kind: 'lab', lockedProviderId: id as string })}`
### error_empty_loading_retry_cancel
- `22: const [loading, setLoading] = useState(true);`
- `33: } catch (err) {`
- `34: console.error(err);`
- `35: // Fallback or handle error`
- `37: setLoading(false);`
- `43: if (loading) {`
- `109: Linking.openURL(url).catch(() => showLocalizedAlert('تعذّر فتح الخرائط'));`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
