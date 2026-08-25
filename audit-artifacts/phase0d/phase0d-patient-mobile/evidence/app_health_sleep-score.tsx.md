# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/health/sleep-score.tsx`
- **Member SHA-256:** `0b972641a26c3a5ca94341b9a5764cc34625da62628e7739d3cfe98586ff9987`
- **Line count:** 180
- **Read range:** `1-180`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router } from 'expo-router';`
- `22: export default function SleepScoreScreen() {`
- `69: <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />`
- `83: <Button label="إعادة المحاولة" variant="gradient" icon="refresh" onPress={load} />`
- `117: onPress={() => router.push('/health/sleep-tracker')}`
### backend_consumers_or_contracts
- `34: const res = await apiFetch('/health/sleep?limit=30');`
### auth_ownership
- `83: <Button label="إعادة المحاولة" variant="gradient" icon="refresh" onPress={load} />`
### state_transitions
- `3: import React, { useCallback, useEffect, useState } from 'react';`
- `26: const [loading, setLoading] = useState(true);`
- `27: const [error, setError] = useState<string | null>(null);`
- `28: const [readings, setReadings] = useState<any[]>([]);`
- `32: setLoading(true);`
- `33: setError(null);`
- `37: setError(e?.message || 'تعذر تحميل بيانات النوم');`
- `39: setLoading(false);`
- `73: {loading ? (`
- `79: {error ? (`
- `82: <AppText variant="bodySM" color={colors.textSecondary} align="center">{error}</AppText>`
### payment_insurance_relevance
- `9: import { AppText, Card, Button, IconButton } from '../../src/components/ui';`
- `80: <Card style={{ alignItems: 'center', gap: 10, padding: 24 }}>`
- `84: </Card>`
- `88: <Card style={[{ backgroundColor: isDark ? colors.surface : colors.white }]}>`
- `121: </Card>`
- `125: <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white }]}>`
- `148: <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white }]}>`
- `174: card: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },`
### error_empty_loading_retry_cancel
- `26: const [loading, setLoading] = useState(true);`
- `27: const [error, setError] = useState<string | null>(null);`
- `32: setLoading(true);`
- `33: setError(null);`
- `36: } catch (e: any) {`
- `37: setError(e?.message || 'تعذر تحميل بيانات النوم');`
- `39: setLoading(false);`
- `73: {loading ? (`
- `79: {error ? (`
- `82: <AppText variant="bodySM" color={colors.textSecondary} align="center">{error}</AppText>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
