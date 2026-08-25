# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/health/prescriptions.tsx`
- **Member SHA-256:** `9ef8d4e8641ff68859c2dc281b7d259708f294c3ef0437dff9fdb9f846d701a7`
- **Line count:** 145
- **Read range:** `1-145`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router } from 'expo-router';`
- `16: export default function PrescriptionsScreen() {`
- `42: <IconButton icon="camera" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/pharmacy/rx-order')} />`
- `44: <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />`
- `69: onPress={() => router.push('/(tabs)/pharmacy')}`
- `76: onPress={() => {`
### backend_consumers_or_contracts
- `26: const res = await apiFetch('/health/prescriptions');`
- `42: <IconButton icon="camera" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/pharmacy/rx-order')} />`
- `69: onPress={() => router.push('/(tabs)/pharmacy')}`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useState } from 'react';`
- `4: import { View, StyleSheet, FlatList, TouchableOpacity, StatusBar, Share } from 'react-native';`
- `20: const [prescriptions, setPrescriptions] = useState<any[]>([]);`
- `21: const [loading, setLoading] = useState(true);`
- `29: console.error(err);`
- `31: setLoading(false);`
- `39: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
### payment_insurance_relevance
- `11: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `48: <Card style={{ flexDirection: 'row-reverse', backgroundColor: colors.surface }}>`
- `55: </Card>`
- `64: <View style={[styles.rxCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>`
- `129: rxCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, gap: 10 },`
### error_empty_loading_retry_cancel
- `21: const [loading, setLoading] = useState(true);`
- `28: } catch (err) {`
- `29: console.error(err);`
- `31: setLoading(false);`
- `80: }).catch(() => {});`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
