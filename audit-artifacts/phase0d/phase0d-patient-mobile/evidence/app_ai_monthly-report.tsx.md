# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/ai/monthly-report.tsx`
- **Member SHA-256:** `74af27b4961e4381e7dbaf371d65da3c1ac80c1c87940317470c2f98d5960c40`
- **Line count:** 263
- **Read range:** `1-263`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: // hazard. Now every number on this screen is derived from the patient's real data:`
- `11: import { router } from 'expo-router';`
- `23: export default function MonthlyReportScreen() {`
- `67: return d && d.getTime() > now.getTime() && !['CANCELLED', 'cancelled'].includes(a?.state || a?.status);`
- `86: <TouchableOpacity onPress={() => router.back()} style={styles.hBtn} accessibilityLabel="رجوع">`
- `105: <TouchableOpacity onPress={() => router.replace('/ai/monthly-report')} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}><AppText variant="bodySM" color="#fff">إعادة المحاولة</AppText></TouchableOpacity>`
- `115: <TouchableOpacity onPress={() => router.push('/health/vitals-log')} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>`
- `173: onPress={() => setExpandedVital(expandedVital === key ? null : key)}`
- `191: <TouchableOpacity onPress={() => router.push('/health/trends')} style={[styles.recBox, { backgroundColor: colors.primary + '10' }]}>`
- `229: <TouchableOpacity onPress={() => router.push('/health/trends')} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>`
- `232: <TouchableOpacity onPress={() => router.push('/(tabs)/consultations')}`
### backend_consumers_or_contracts
- `6: //   /care/appointments · /health/vitals/summary · /health/chronic-meds · /health/trends`
- `39: apiFetch('/care/appointments').then(parseReportCollection),`
- `40: apiFetch('/health/vitals/summary').then(parseReportCollection),`
- `41: apiFetch('/health/chronic-meds').then(parseReportCollection),`
- `42: apiFetch('/health/trends').then(parseReportCollection),`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `7: import React, { useEffect, useMemo, useState } from 'react';`
- `9: View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator,`
- `27: const [loading, setLoading] = useState(true);`
- `28: const [appointments, setAppointments] = useState<any[]>([]);`
- `29: const [vitals, setVitals] = useState<any[]>([]);`
- `30: const [meds, setMeds] = useState<any[]>([]);`
- `31: const [trends, setTrends] = useState<any[]>([]);`
- `32: const [loadError, setLoadError] = useState(false);`
- `33: const [expandedVital, setExpandedVital] = useState<string | null>(null);`
- `45: const collectionAt = (index: number) => results[index].status === 'fulfilled' ? results[index].value : [];`
- `50: setLoadError(results.every((result) => result.status === 'rejected'));`
- `51: setLoading(false);`
### payment_insurance_relevance
- `101: <View style={[styles.emptyCard, { backgroundColor: isDark ? colors.surface : colors.white }]}>`
- `109: <View style={[styles.emptyCard, { backgroundColor: isDark ? colors.surface : colors.white }]}>`
- `123: <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white }]}>`
- `148: <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white }]}>`
- `174: style={[styles.analysisCard, { backgroundColor: isDark ? colors.surface : colors.white }]}`
- `204: <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16 }]}>`
- `247: card: { borderRadius: 20, padding: 16, margin: 16, marginBottom: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },`
- `248: emptyCard: { borderRadius: 20, padding: 24, margin: 16, alignItems: 'center', gap: 4 },`
- `252: analysisCard: { borderRadius: 18, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },`
### error_empty_loading_retry_cancel
- `27: const [loading, setLoading] = useState(true);`
- `32: const [loadError, setLoadError] = useState(false);`
- `50: setLoadError(results.every((result) => result.status === 'rejected'));`
- `51: setLoading(false);`
- `67: return d && d.getTime() > now.getTime() && !['CANCELLED', 'cancelled'].includes(a?.state || a?.status);`
- `72: if (loading) {`
- `100: {loadError && (`
- `101: <View style={[styles.emptyCard, { backgroundColor: isDark ? colors.surface : colors.white }]}>`
- `102: <Icon name="warning" size={44} color={colors.error} />`
- `108: {!loadError && !hasAnyData && (`
- `109: <View style={[styles.emptyCard, { backgroundColor: isDark ? colors.surface : colors.white }]}>`
- `122: {!loadError && hasAnyData && (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
