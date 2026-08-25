# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/delivery/address-select.tsx`
- **Member SHA-256:** `dcec21979ba59558dadac7f7e1039c433ada9069d95d3d69364c7cd180f7ec79`
- **Line count:** 180
- **Read range:** `1-180`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: import { router } from 'expo-router';`
- `25: export default function AddressSelectScreen() {`
- `55: router.back();`
- `66: <IconButton icon="back" onPress={() => router.back()} />`
- `73: onPress={() => router.push('/shared/location-picker')}`
- `96: onPress={() => setSelected(addr.id)}`
- `135: onPress={() => router.push('/shared/location-picker')}`
- `148: onPress={handleConfirm}`
### backend_consumers_or_contracts
- `36: const data = await apiFetch('/users/me/addresses');`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useState, useEffect, useCallback } from 'react';`
- `5: View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator,`
- `28: const [selected, setSelected] = useState<string | null>(null);`
- `29: const [addresses, setAddresses] = useState<Address[]>([]);`
- `30: const [loading, setLoading] = useState(true);`
- `34: setLoading(true);`
- `42: // No mock fallback — show the honest empty state`
- `45: setLoading(false);`
- `60: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
- `83: {loading ? (`
- `86: <View style={styles.emptyWrap}>`
- `166: emptyWrap: { alignItems: 'center', gap: 12, paddingVertical: 30 },`
### payment_insurance_relevance
- `98: styles.addrCard,`
- `167: addrCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16 },`
### error_empty_loading_retry_cancel
- `30: const [loading, setLoading] = useState(true);`
- `34: setLoading(true);`
- `41: } catch {`
- `42: // No mock fallback — show the honest empty state`
- `45: setLoading(false);`
- `83: {loading ? (`
- `86: <View style={styles.emptyWrap}>`
- `166: emptyWrap: { alignItems: 'center', gap: 12, paddingVertical: 30 },`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
