# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/diagnostics/cart.tsx`
- **Member SHA-256:** `0c4812e364542484aa98ce0f0f7a323500ba84fa2323eb39da11048761f7c3ed`
- **Line count:** 229
- **Read range:** `1-229`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { useRouter, Stack } from 'expo-router';`
- `17: const router = useRouter();`
- `46: <Stack.Screen options={{ headerShown: false }} />`
- `50: <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>`
- `58: <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>`
- `68: <Stack.Screen options={{ headerShown: false }} />`
- `72: <TouchableOpacity onPress={() => clearCart()} style={styles.headerBtn}>`
- `76: <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>`
- `89: <TouchableOpacity onPress={() => removeItem(item.id, item.kind)} style={styles.removeBtn}>`
- `110: onPress={() => setServiceType('home')}`
- `118: onPress={() => setServiceType('clinic')}`
- `143: onPress={() => setSelectedLab(lab.id)}`
### backend_consumers_or_contracts
- `30: apiFetch(`/labs/compatible-providers?testIds=${ids}`)`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState } from 'react';`
- `3: import { StyleSheet, View, Text, TouchableOpacity, ScrollView, FlatList, TextInput, Image, ActivityIndicator, Platform, Alert, StatusBar, KeyboardAvoidingView, Modal, I18nManager, Dimensions } from 'react-native';`
- `21: const [serviceType, setServiceType] = useState<'home' | 'clinic'>('home');`
- `22: const [selectedLab, setSelectedLab] = useState<string | null>(null);`
- `23: const [compatibleLabs, setCompatibleLabs] = useState<any[]>([]);`
- `24: const [loadingLabs, setLoadingLabs] = useState(false);`
- `28: setLoadingLabs(true);`
- `32: .catch(console.error)`
- `33: .finally(() => setLoadingLabs(false));`
- `54: <View style={styles.emptyContainer}>`
- `133: {loadingLabs ? (`
- `172: {!loadingLabs && compatibleLabs.length === 0 && <AppText style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 12 }}>لا يوجد مزود متوافق ومفعّل لهذه الفحوصات حالياً.</AppText>}`
### payment_insurance_relevance
- `40: // Calculate base total from items`
- `41: const baseTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);`
- `94: <AppText style={{ fontSize: 15, fontWeight: '900', color: colors.primary, marginTop: 4, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>{item.price} ر.س</AppText>`
- `137: const labTotal = baseTotal;`
- `148: <View style={styles.labPrice}>`
- `149: <AppText style={{ fontSize: 18, fontWeight: '900', color: colors.primary }}>{labTotal}</AppText>`
- `181: <View style={styles.totalRow}>`
- `184: {baseTotal} <AppText style={{ fontSize: 12, color: colors.textSecondary }}>ر.س</AppText>`
- `225: labPrice: { alignItems: 'center', paddingRight: I18nManager.isRTL ? 12 : 0, paddingLeft: I18nManager.isRTL ? 0 : 12, borderRightWidth: I18nManager.isRTL ? 1 : 0, borderLeftWidth: I18nManager.isRTL ? 0 : 1, borderColor: 'rgba(0,0,0,0.05)' },`
- `227: totalRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },`
### error_empty_loading_retry_cancel
- `24: const [loadingLabs, setLoadingLabs] = useState(false);`
- `28: setLoadingLabs(true);`
- `32: .catch(console.error)`
- `33: .finally(() => setLoadingLabs(false));`
- `54: <View style={styles.emptyContainer}>`
- `133: {loadingLabs ? (`
- `172: {!loadingLabs && compatibleLabs.length === 0 && <AppText style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 12 }}>لا يوجد مزود متوافق ومفعّل لهذه الفحوصات حالياً.</AppText>}`
- `209: emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
