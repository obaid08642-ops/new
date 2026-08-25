# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/health/actionable-order.tsx`
- **Member SHA-256:** `449ee980c3106eea0b9402b004e069c4873e85ea0f25a5193936e6946f7786ac`
- **Line count:** 160
- **Read range:** `1-160`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { useLocalSearchParams, useRouter } from 'expo-router';`
- `9: // Theme facade over the real design tokens (light palette — screen is static-styled)`
- `23: export default function ActionableOrderScreen() {`
- `24: const router = useRouter();`
- `37: router.push('/(tabs)/pharmacy');`
- `40: const handleBookLabs = () => {`
- `41: // M1-33: fixed broken route — /labs does not exist; labs live under /diagnostics`
- `42: router.push('/diagnostics/search');`
- `48: <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>`
- `80: <TouchableOpacity style={styles.actionBtn} onPress={handleOrderMeds} disabled={loading}>`
- `109: <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.warning }]} onPress={handleBookLabs} disabled={loading}>`
- `131: <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.info }]} onPress={() => router.push('/diagnostics/search')}>`
### backend_consumers_or_contracts
- `37: router.push('/(tabs)/pharmacy');`
- `41: // M1-33: fixed broken route — /labs does not exist; labs live under /diagnostics`
### auth_ownership
- `9: // Theme facade over the real design tokens (light palette — screen is static-styled)`
### state_transitions
- `2: import React, { useState } from 'react';`
- `17: success: Colors.light.success,`
- `18: successBg: Colors.light.successSurface,`
- `26: const [loading, setLoading] = useState(false);`
- `57: <I name="check-circle" size={24} color={theme.success} />`
- `80: <TouchableOpacity style={styles.actionBtn} onPress={handleOrderMeds} disabled={loading}>`
- `109: <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.warning }]} onPress={handleBookLabs} disabled={loading}>`
- `149: alertBox: { flexDirection: 'row-reverse', backgroundColor: theme.successBg, padding: SP.lg, borderRadius: R.md, marginBottom: SP.xl, alignItems: 'center', gap: SP.md },`
- `150: alertTitle: { fontSize: 16, fontWeight: 'bold', color: theme.success, textAlign: 'right' },`
- `151: alertSub: { fontSize: 14, color: theme.success, textAlign: 'right', marginTop: 4 },`
### payment_insurance_relevance
- `28: // Parse payload pushed from the consultation end`
- `29: const payload = typeof params.payload === 'string' ? JSON.parse(params.payload) : {`
- `65: {payload.erx && payload.erx.length > 0 ? (`
- `71: {payload.erx.map((med: any, idx: number) => (`
- `95: {payload.labs && payload.labs.length > 0 ? (`
- `101: {payload.labs.map((lab: any, idx: number) => (`
- `117: {payload.radiology && payload.radiology.length > 0 ? (`
- `123: {payload.radiology.map((rad: any, idx: number) => (`
### error_empty_loading_retry_cancel
- `26: const [loading, setLoading] = useState(false);`
- `80: <TouchableOpacity style={styles.actionBtn} onPress={handleOrderMeds} disabled={loading}>`
- `109: <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.warning }]} onPress={handleBookLabs} disabled={loading}>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
