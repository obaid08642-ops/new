# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(tabs)/diagnostics.tsx`
- **Member SHA-256:** `aece3dbcb0066d8facc28dbb2a30ccacf24ecbf748358500fa077e68efa05420`
- **Line count:** 487
- **Read range:** `1-487`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { useRouter, Tabs, useFocusEffect } from 'expo-router';`
- `20: const router = useRouter();`
- `88: <Tabs.Screen options={{ headerShown: false }} />`
- `96: onPress={() => (router.push as any)('/diagnostics/orders')}`
- `118: <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginHorizontal: 8 }}>`
- `122: <TouchableOpacity onPress={() => setShowFilters(true)}>`
- `131: onPress={() => setMainTab('labs')}`
- `139: onPress={() => setMainTab('radiology')}`
- `150: onPress={() => setServiceType('home')}`
- `158: onPress={() => setServiceType('clinic')}`
- `180: <TouchableOpacity onPress={() => (router.push as any)('/delivery/address-select')}>`
- `188: <TouchableOpacity style={styles.insuranceCard} onPress={() => (router.push as any)('/diagnostics/insurance-upload')}>`
### backend_consumers_or_contracts
- `59: apiFetch('/labs/packages').catch(() => ({ data: [] })),`
- `60: apiFetch('/labs/services').catch(() => ({ data: [] })),`
- `61: apiFetch('/radiology/services').catch(() => ({ data: [] })),`
- `62: apiFetch('/providers?type=lab').catch(() => ({ data: [] }))`
- `96: onPress={() => (router.push as any)('/diagnostics/orders')}`
- `188: <TouchableOpacity style={styles.insuranceCard} onPress={() => (router.push as any)('/diagnostics/insurance-upload')}>`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState } from 'react';`
- `3: import { StyleSheet, View, Text, TouchableOpacity, ScrollView, FlatList, TextInput, Image, ActivityIndicator, Platform, Alert, StatusBar, KeyboardAvoidingView, Modal, I18nManager, Dimensions } from 'react-native';`
- `24: const [mainTab, setMainTab] = useState<'labs' | 'radiology'>('labs');`
- `25: const [serviceType, setServiceType] = useState<'home' | 'clinic'>('home');`
- `26: const [searchQuery, setSearchQuery] = useState('');`
- `27: const [showFilters, setShowFilters] = useState(false);`
- `28: const [activeFilter, setActiveFilter] = useState('all');`
- `30: const [packages, setPackages] = useState<any[]>([]);`
- `31: const [testsPart1, setTestsPart1] = useState<any[]>([]);`
- `32: const [testsPart2, setTestsPart2] = useState<any[]>([]);`
- `33: const [radiologyServices, setRadiologyServices] = useState<any[]>([]);`
- `34: const [labs, setLabs] = useState<any[]>([]);`
### payment_insurance_relevance
- `186: {/* Insurance Golden Button */}`
- `188: <TouchableOpacity style={styles.insuranceCard} onPress={() => (router.push as any)('/diagnostics/insurance-upload')}>`
- `189: <View style={styles.insuranceGradient}>`
- `190: <View style={[styles.insuranceIconWrap, { backgroundColor: colors.surface } ]}>`
- `193: <View style={styles.insuranceText}>`
- `215: <TouchableOpacity style={[styles.pkgCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => (router.push as any)(`/diagnostics/package-detail?id=${pkg.id}&serviceType=${serviceType}`)}>`
- `228: <View style={styles.priceRow}>`
- `230: {pkg.oldPrice && <AppText style={{ fontSize: 11, color: colors.textSecondary, textDecorationLine: 'line-through' }}>{pkg.oldPrice} ر.س</AppText>}`
- `231: <AppText style={{ fontSize: 18, fontWeight: '900', color: colors.primary }}>{pkg.price} <AppText style={{ fontSize: 10, color: colors.primary }}>ر.س</AppText></AppText>`
- `259: <AppText style={{ fontSize: 16, fontWeight: '900', color: colors.primary, marginTop: 6, textAlign: 'left' }}>{test.price} ر.س</AppText>`
- `270: onPress={() => addItem({ id: test.id, name: test.name, price: typeof test.price === 'string' ? parseInt(test.price) : test.price, kind: 'lab' })}`
- `291: <TouchableOpacity style={[styles.labCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => (router.push as any)(`/diagnostics/lab/${lab.id}`)}>`
### error_empty_loading_retry_cancel
- `35: const [loading, setLoading] = useState(true);`
- `59: apiFetch('/labs/packages').catch(() => ({ data: [] })),`
- `60: apiFetch('/labs/services').catch(() => ({ data: [] })),`
- `61: apiFetch('/radiology/services').catch(() => ({ data: [] })),`
- `62: apiFetch('/providers?type=lab').catch(() => ({ data: [] }))`
- `77: } catch (err) {`
- `78: console.error(err);`
- `80: setLoading(false);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
