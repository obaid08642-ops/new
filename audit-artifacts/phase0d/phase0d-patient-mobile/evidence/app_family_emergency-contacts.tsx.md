# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/family/emergency-contacts.tsx`
- **Member SHA-256:** `76ba00687856038f9fdcafd5619202bc00e74afb8fe4799d73a767359826f722`
- **Line count:** 193
- **Read range:** `1-193`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router } from "expo-router";`
- `26: export default function FamilyEmergencyContactsScreen() {`
- `67: <IconButton icon="add" onPress={() => router.push("/family/invite")} />`
- `69: <IconButton icon="back" onPress={() => router.back()} />`
- `104: <Button label="إعادة المحاولة" variant="outline" onPress={() => load()} />`
- `145: onPress={() => call(c.phone)}`
- `157: onPress={() => router.push("/family/invite")}`
- `161: onPress={() => router.push("/emergency/sos")}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `4: import { View, StyleSheet, ScrollView, StatusBar, Linking, ActivityIndicator, RefreshControl } from "react-native";`
- `31: const [refreshing, setRefreshing] = useState(false);`
- `44: setRefreshing(false);`
- `79: refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.primary} />}`
### state_transitions
- `3: import React, { useCallback, useEffect, useState } from "react";`
- `4: import { View, StyleSheet, ScrollView, StatusBar, Linking, ActivityIndicator, RefreshControl } from "react-native";`
- `29: const [contacts, setContacts] = useState<EmergencyContact[]>([]);`
- `30: const [loading, setLoading] = useState(true);`
- `31: const [refreshing, setRefreshing] = useState(false);`
- `32: const [error, setError] = useState(false);`
- `35: if (!silent) setLoading(true);`
- `36: setError(false);`
- `41: setError(true);`
- `43: setLoading(false);`
- `56: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
- `72: {loading ? (`
### payment_insurance_relevance
- `11: Card,`
- `81: <Card style={{ backgroundColor: colors.errorSurface }}>`
- `98: </Card>`
- `120: <Card`
- `148: </Card>`
- `160: <Card`
- `176: </Card>`
### error_empty_loading_retry_cancel
- `30: const [loading, setLoading] = useState(true);`
- `32: const [error, setError] = useState(false);`
- `35: if (!silent) setLoading(true);`
- `36: setError(false);`
- `40: } catch {`
- `41: setError(true);`
- `43: setLoading(false);`
- `51: if (phone) Linking.openURL(`tel:${phone}`).catch(() => {});`
- `72: {loading ? (`
- `81: <Card style={{ backgroundColor: colors.errorSurface }}>`
- `89: <Icon name="emergency" size={22} color={colors.error} />`
- `100: {error && contacts.length === 0 ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
