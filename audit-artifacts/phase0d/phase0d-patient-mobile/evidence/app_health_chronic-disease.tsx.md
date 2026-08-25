# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/health/chronic-disease.tsx`
- **Member SHA-256:** `2e5d37000b3ac504569b42a1da40ff05d43a7da2199806296f64104283205765`
- **Line count:** 203
- **Read range:** `1-203`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router } from 'expo-router';`
- `13: export default function ChronicDiseaseScreen() {`
- `44: <IconButton icon="add" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/health/edit-profile')} />`
- `46: <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />`
- `64: <TouchableOpacity onPress={() => setExpandedId(expandedId === cond.id ? null : cond.id)} style={styles.condHeader}>`
- `141: <TouchableOpacity onPress={() => router.push('/(tabs)/consultations')}`
- `142: style={[styles.bookCheckBtn, { backgroundColor: cond.color || colors.primary } ]}>`
- `173: <TouchableOpacity onPress={() => router.push('/health/vitals')}`
- `198: bookCheckBtn: { marginTop: 16, paddingVertical: 12, borderRadius: 24, alignItems: 'center' },`
### backend_consumers_or_contracts
- `26: apiFetch('/health/chronic-diseases').catch(() => null),`
- `27: apiFetch('/health/vitals').catch(() => null),`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useState } from 'react';`
- `17: const [expandedId, setExpandedId] = useState<string | null>(null);`
- `18: const [conditions, setConditions] = useState<any[]>([]);`
- `19: const [readings, setReadings] = useState<any[]>([]);`
- `20: const [loading, setLoading] = useState(true);`
- `32: console.error(err);`
- `34: setLoading(false);`
### payment_insurance_relevance
- `9: import { AppText, Card, Badge, IconButton } from '../../src/components/ui';`
- `52: {/* Stats Card */}`
- `53: <Card style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', padding: 16, backgroundColor: colors.surface }}>`
- `60: </Card>`
- `63: <Card key={cond.id} style={{ backgroundColor: isDark ? colors.surface : colors.white, padding: 0, overflow: 'hidden' }}>`
- `147: </Card>`
- `151: <Card style={[{ backgroundColor: isDark ? colors.surface : colors.white } ]}>`
- `178: </Card>`
### error_empty_loading_retry_cancel
- `20: const [loading, setLoading] = useState(true);`
- `26: apiFetch('/health/chronic-diseases').catch(() => null),`
- `27: apiFetch('/health/vitals').catch(() => null),`
- `31: } catch (err) {`
- `32: console.error(err);`
- `34: setLoading(false);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
