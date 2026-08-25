# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/health/wearables.tsx`
- **Member SHA-256:** `bdbf4af9ffcd414caba71dea8ffba9ef98ffef020f8c4bda89c6172f7a19b28f`
- **Line count:** 232
- **Read range:** `1-232`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: // app/health/wearables.tsx — real /wearables API (compat): devices register + metric samples`
- `5: import { router } from 'expo-router';`
- `33: export default function WearablesScreen() {`
- `40: const [registering, setRegistering] = useState<string | null>(null);`
- `59: const registerDevice = async (name: string) => {`
- `60: setRegistering(name);`
- `71: setRegistering(null);`
- `97: <IconButton icon="sleep" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/health/sleep-tracker')} />`
- `99: <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />`
- `162: {/* Supported Devices — tap to register */}`
- `171: disabled={already || registering !== null}`
- `172: onPress={() => registerDevice(d.name)}`
### backend_consumers_or_contracts
- `45: apiFetch('/wearables/devices').catch(() => null),`
- `46: apiFetch('/wearables/data').catch(() => null),`
- `62: await apiFetch('/wearables/devices', {`
### auth_ownership
- `150: <Icon name="refresh" size={16} color={colors.primary} />`
### state_transitions
- `3: import React, { useState } from 'react';`
- `4: import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert } from 'react-native';`
- `37: const [devices, setDevices] = useState<any[]>([]);`
- `38: const [samples, setSamples] = useState<any[]>([]);`
- `39: const [loading, setLoading] = useState(true);`
- `40: const [registering, setRegistering] = useState<string | null>(null);`
- `51: console.error(e);`
- `53: setLoading(false);`
- `94: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
- `110: {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}`
- `113: {!loading && metricEntries.length > 0 && (`
- `134: {!loading && devices.length === 0 && (`
### payment_insurance_relevance
- `9: import { AppText, Card, IconButton } from '../../src/components/ui';`
- `102: <Card style={{ marginTop: 16, flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.surface }}>`
- `105: </Card>`
- `114: <View style={[styles.todayCard, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16, marginTop: 16 } ]}>`
- `120: <View key={metric} style={[styles.statCard, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary } ]}>`
- `141: <View key={device.id} style={[styles.deviceCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>`
- `163: <View style={[styles.supportedCard, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16 } ]}>`
- `201: todayCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },`
- `206: statCard: { width: '47%', borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },`
- `215: deviceCard: { marginHorizontal: 16, marginBottom: 10, borderRadius: 18, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius:`
- `228: supportedCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },`
### error_empty_loading_retry_cancel
- `39: const [loading, setLoading] = useState(true);`
- `45: apiFetch('/wearables/devices').catch(() => null),`
- `46: apiFetch('/wearables/data').catch(() => null),`
- `50: } catch (e) {`
- `51: console.error(e);`
- `53: setLoading(false);`
- `68: } catch (err: any) {`
- `89: try { return new Date(d).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long' }); } catch { return ''; }`
- `110: {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}`
- `113: {!loading && metricEntries.length > 0 && (`
- `134: {!loading && devices.length === 0 && (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
