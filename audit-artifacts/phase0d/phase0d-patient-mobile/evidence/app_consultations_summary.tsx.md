# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/summary.tsx`
- **Member SHA-256:** `751ea051db706a26f8b4b78665cfe7a74c0c15f3899901d4a9ce1da61f942df8`
- **Line count:** 181
- **Read range:** `1-181`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { router, useLocalSearchParams } from 'expo-router';`
- `14: import { ScreenState } from '../../src/components/ScreenStates';`
- `17: export default function ConsultationSummaryScreen() {`
- `54: if (loading) return <ScreenState loading>{null}</ScreenState>;`
- `55: if (error) return <ScreenState error={error} onRetry={() => load()}>{null}</ScreenState>;`
- `58: <ScreenState`
- `63: onRetry={() => load()}`
- `64: >{null}</ScreenState>`
- `71: const bookFollowUp = () => {`
- `72: router.push({`
- `73: pathname: '/consultations/booking-confirm',`
- `104: : `The doctor recommended a follow-up within ${windowDays} days — book now at a discounted rate.`}`
### backend_consumers_or_contracts
- `4: * GET /care/appointments/:id/summary — تشخيص/ملاحظات/وصفة/توصيات`
- `36: try { setAppt(await apiFetch<any>(`/care/appointments/${appointmentId}`)); } catch {}`
- `37: const s = await apiFetch<any>(`/care/appointments/${appointmentId}/summary`);`
### auth_ownership
- `8: import { View, StyleSheet, ScrollView, StatusBar, RefreshControl } from 'react-native';`
- `26: const [refreshing, setRefreshing] = useState(false);`
- `30: const load = useCallback(async (isRefresh = false) => {`
- `32: if (isRefresh) setRefreshing(true); else setLoading(true);`
- `48: setRefreshing(false);`
- `93: refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}`
### state_transitions
- `7: import React, { useEffect, useState, useCallback } from 'react';`
- `8: import { View, StyleSheet, ScrollView, StatusBar, RefreshControl } from 'react-native';`
- `14: import { ScreenState } from '../../src/components/ScreenStates';`
- `23: const [summary, setSummary] = useState<any>(null);`
- `24: const [appt, setAppt] = useState<any>(null);`
- `25: const [loading, setLoading] = useState(true);`
- `26: const [refreshing, setRefreshing] = useState(false);`
- `27: const [error, setError] = useState<string | null>(null);`
- `28: const [notReady, setNotReady] = useState(false);`
- `31: if (!appointmentId) { setError(AR ? 'معرّف الموعد مفقود' : 'Missing appointment id'); setLoading(false); return; }`
- `32: if (isRefresh) setRefreshing(true); else setLoading(true);`
- `33: setError(null);`
### payment_insurance_relevance
- `13: import { AppText, Card, Button, Badge } from '../../src/components/ui';`
- `96: <Card style={{ borderWidth: 1, borderColor: colors.primary, gap: 8 }}>`
- `107: </Card>`
- `111: <Card style={{ gap: 8 }}>`
- `117: </Card>`
- `121: <Card style={{ gap: 10 }}>`
- `143: </Card>`
- `147: <Card style={{ gap: 8 }}>`
- `153: </Card>`
- `157: <Card style={{ gap: 8 }}>`
- `163: </Card>`
### error_empty_loading_retry_cancel
- `25: const [loading, setLoading] = useState(true);`
- `27: const [error, setError] = useState<string | null>(null);`
- `31: if (!appointmentId) { setError(AR ? 'معرّف الموعد مفقود' : 'Missing appointment id'); setLoading(false); return; }`
- `32: if (isRefresh) setRefreshing(true); else setLoading(true);`
- `33: setError(null);`
- `36: try { setAppt(await apiFetch<any>(`/care/appointments/${appointmentId}`)); } catch {}`
- `39: } catch (e: any) {`
- `44: setError(e?.message || (AR ? 'تعذر تحميل الملخص' : 'Failed to load summary'));`
- `47: setLoading(false);`
- `54: if (loading) return <ScreenState loading>{null}</ScreenState>;`
- `55: if (error) return <ScreenState error={error} onRetry={() => load()}>{null}</ScreenState>;`
- `59: empty`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
