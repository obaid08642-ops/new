# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/diagnostics/results-history.tsx`
- **Member SHA-256:** `94e6d5156c5aa1c0b6da91e3a4b087ca2c9be746a6afaa5a80798e5636a14890`
- **Line count:** 125
- **Read range:** `1-125`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router } from 'expo-router';`
- `11: export default function ResultsHistoryScreen() {`
- `20: const data = await apiFetch<any[]>('/labs/bookings/mine');`
- `21: // Filter only reported or bookings with reports`
- `43: <IconButton icon="back" onPress={() => router.back()} />`
- `72: onPress={() => hasReport && router.push({ pathname: '/reports/view-report', params: { id: report.id || item.id } })}`
### backend_consumers_or_contracts
- `20: const data = await apiFetch<any[]>('/labs/bookings/mine');`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState, useEffect } from 'react';`
- `3: import { View, StyleSheet, FlatList, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';`
- `14: const [results, setResults] = useState<any[]>([]);`
- `15: const [loading, setLoading] = useState(true);`
- `19: setLoading(true);`
- `23: b => b.state === 'REPORTED' || (b.reports && b.reports.length > 0)`
- `27: console.log('Error loading results history', err);`
- `29: setLoading(false);`
- `39: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
- `46: {loading ? (`
- `81: <View style={[styles.pendingBadge, { backgroundColor: '#FEF3C7' } ]}>`
- `124: pendingBadge: { borderRadius: 10, padding: 8, alignItems: 'center' },`
### payment_insurance_relevance
- `8: import { AppText, Card, Badge, IconButton } from '../../src/components/ui';`
- `70: style={[styles.resultCard, { backgroundColor: colors.surface }]}`
- `117: resultCard: { borderRadius: 18, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },`
### error_empty_loading_retry_cancel
- `15: const [loading, setLoading] = useState(true);`
- `19: setLoading(true);`
- `26: } catch (err) {`
- `27: console.log('Error loading results history', err);`
- `29: setLoading(false);`
- `46: {loading ? (`
- `81: <View style={[styles.pendingBadge, { backgroundColor: '#FEF3C7' } ]}>`
- `124: pendingBadge: { borderRadius: 10, padding: 8, alignItems: 'center' },`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
