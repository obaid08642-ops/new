# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/notifications/index.tsx`
- **Member SHA-256:** `2c5b00004df30ba4319c5e2457c1e356d3a65294643f354aba0291106874f8b0`
- **Line count:** 220
- **Read range:** `1-220`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router } from 'expo-router';`
- `11: import { translateBackendRoute } from '../../src/hooks/usePushNotifications';`
- `23: route?: string;`
- `71: route: n.action?.route,`
- `77: export default function NotificationsScreen() {`
- `116: // Backend routes use the server vocabulary (/tracking/lab/:id, /orders/:id …) —`
- `117: // translate to real app paths; pushing raw would hit an unmatched-route blank screen.`
- `118: if (n.route) {`
- `119: const translated = translateBackendRoute(n.route);`
- `120: if (translated) router.push({ pathname: translated.pathname as any, params: translated.params || {} });`
- `129: <TouchableOpacity onPress={markAllRead}><AppText variant="labelMD" color={colors.primary}>قراءة الكل</AppText></TouchableOpacity>`
- `135: <IconButton icon="back" onPress={() => {`
### backend_consumers_or_contracts
- `2: // app/notifications/index.tsx — Grouped notifications by System, Medical, Promotions (real backend feed)`
- `90: const rows = await apiFetch<any[]>('/notifications');`
- `107: try { await apiFetch('/notifications/read-all', { method: 'POST' }); }`
- `114: apiFetch(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});`
- `116: // Backend routes use the server vocabulary (/tracking/lab/:id, /orders/:id …) —`
### auth_ownership
- `4: import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList } from 'react-native';`
- `83: const [refreshing, setRefreshing] = useState(false);`
- `96: setRefreshing(false);`
- `166: refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.primary} />}`
- `176: <TouchableOpacity accessibilityRole="button" accessibilityLabel="إعادة المحاولة" onPress={() => load()} style={[st.filterChip, { backgroundColor: colors.primary, borderColor: colors.primary }]}>`
- `189: <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${n.title}. ${n.body}`} activeOpacity={0.85} onPress={() => openNotif(n)}>`
### state_transitions
- `3: import React, { useCallback, useEffect, useState } from 'react';`
- `4: import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList } from 'react-native';`
- `80: const [filter, setFilter] = useState<CategoryGroup | 'all'>('all');`
- `81: const [notifs, setNotifs] = useState<Notif[]>([]);`
- `82: const [loading, setLoading] = useState(true);`
- `83: const [refreshing, setRefreshing] = useState(false);`
- `84: const [error, setError] = useState(false);`
- `87: if (!silent) setLoading(true);`
- `88: setError(false);`
- `93: setError(true);`
- `95: setLoading(false);`
- `108: catch { load(true); } // revert by reloading on failure`
### payment_insurance_relevance
- `9: import { AppText, Card, IconButton } from '../../src/components/ui';`
- `190: <Card style={[st.notifCard, !n.read && { backgroundColor: isDark ? 'rgba(35,181,206,0.1)' : '#DEF5F9' } ]}>`
- `204: </Card>`
- `216: notifCard: { shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, padding: 14 },`
### error_empty_loading_retry_cancel
- `82: const [loading, setLoading] = useState(true);`
- `84: const [error, setError] = useState(false);`
- `87: if (!silent) setLoading(true);`
- `88: setError(false);`
- `92: } catch {`
- `93: setError(true);`
- `95: setLoading(false);`
- `108: catch { load(true); } // revert by reloading on failure`
- `114: apiFetch(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});`
- `157: {loading ? (`
- `171: ListEmptyComponent={`
- `172: error && notifs.length === 0 ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
