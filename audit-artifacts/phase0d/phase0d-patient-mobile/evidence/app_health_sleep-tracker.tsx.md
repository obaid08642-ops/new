# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/health/sleep-tracker.tsx`
- **Member SHA-256:** `4fc1144907762ea4811675a71091f2c7167c0fc27b5701506a48256b034b4c9e`
- **Line count:** 219
- **Read range:** `1-219`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router } from 'expo-router';`
- `21: export default function SleepTrackerScreen() {`
- `98: <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />`
- `107: <Button label="إعادة المحاولة" variant="gradient" icon="refresh" onPress={load} />`
- `180: <Button label="حفظ القراءة" variant="gradient" icon="check_circle" loading={saving} onPress={addReading} />`
### backend_consumers_or_contracts
- `36: const res = await apiFetch('/health/sleep?limit=30');`
- `71: await apiFetch('/health/sleep', {`
### auth_ownership
- `107: <Button label="إعادة المحاولة" variant="gradient" icon="refresh" onPress={load} />`
### state_transitions
- `3: import React, { useCallback, useEffect, useState } from 'react';`
- `25: const [loading, setLoading] = useState(true);`
- `26: const [error, setError] = useState<string | null>(null);`
- `27: const [readings, setReadings] = useState<any[]>([]);`
- `28: const [saving, setSaving] = useState(false);`
- `29: const [hours, setHours] = useState('');`
- `30: const [score, setScore] = useState('');`
- `34: setLoading(true);`
- `35: setError(null);`
- `39: setError(e?.message || 'تعذر تحميل بيانات النوم');`
- `41: setLoading(false);`
- `84: if (loading) {`
### payment_insurance_relevance
- `9: import { AppText, Card, Badge, Button, IconButton, Input } from '../../src/components/ui';`
- `104: <Card style={{ marginHorizontal: 16, marginTop: 12, alignItems: 'center', gap: 10, padding: 24 }}>`
- `108: </Card>`
- `112: <Card style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: isDark ? colors.surface : colors.white }}>`
- `144: </Card>`
- `148: <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16, marginTop: 12 }]}>`
- `173: <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16, marginTop: 12, gap: 10 }]}>`
- `184: <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16, marginTop: 12 }]}>`
- `214: card: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },`
### error_empty_loading_retry_cancel
- `25: const [loading, setLoading] = useState(true);`
- `26: const [error, setError] = useState<string | null>(null);`
- `34: setLoading(true);`
- `35: setError(null);`
- `38: } catch (e: any) {`
- `39: setError(e?.message || 'تعذر تحميل بيانات النوم');`
- `41: setLoading(false);`
- `77: } catch (e: any) {`
- `84: if (loading) {`
- `103: {error ? (`
- `106: <AppText variant="bodySM" color={colors.textSecondary} align="center">{error}</AppText>`
- `180: <Button label="حفظ القراءة" variant="gradient" icon="check_circle" loading={saving} onPress={addReading} />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
