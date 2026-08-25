# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/clinic-location.tsx`
- **Member SHA-256:** `2c01120da741f0e7d9ee9941f92c3f3132acf7f545036422d7ac9d8cca889df4`
- **Line count:** 109
- **Read range:** `1-109`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router, useLocalSearchParams } from 'expo-router';`
- `12: export default function ClinicLocationScreen() {`
- `55: <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, justifyContent: 'center' }}>`
- `94: <TouchableOpacity style={[styles.directionsBtn, { backgroundColor: colors.n, marginTop: 24 }]} onPress={openDirections}>`
### backend_consumers_or_contracts
- `24: apiFetch(`/care/appointments/${appointmentId}`)`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useEffect, useState } from 'react';`
- `3: import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator, Linking, Platform } from 'react-native';`
- `19: const [loading, setLoading] = useState(true);`
- `20: const [data, setData] = useState<any>(null);`
- `25: .then((res: any) => { setData(res?.data || res); setLoading(false); })`
- `26: .catch(() => { setData(null); setLoading(false); });`
- `28: setData(null); setLoading(false);`
- `44: if (loading) return (`
- `52: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `19: const [loading, setLoading] = useState(true);`
- `25: .then((res: any) => { setData(res?.data || res); setLoading(false); })`
- `26: .catch(() => { setData(null); setLoading(false); });`
- `28: setData(null); setLoading(false);`
- `44: if (loading) return (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
