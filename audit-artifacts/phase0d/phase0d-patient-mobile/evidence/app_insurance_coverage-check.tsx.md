# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/insurance/coverage-check.tsx`
- **Member SHA-256:** `578916a6df5d131848343f79b4c7256df5d04e91430bec06d9502b9baa46c7d8`
- **Line count:** 263
- **Read range:** `1-263`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router } from 'expo-router';`
- `22: export default function CoverageCheckScreen() {`
- `81: <TouchableOpacity onPress={() => setStep('form')} style={styles.backBtn}>`
- `140: onPress={() => router.push('/support/chat')}`
- `148: <TouchableOpacity onPress={() => setStep('form')} activeOpacity={0.85}>`
- `163: <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>`
- `176: <TouchableOpacity key={s.id} onPress={() => setServiceType(s.id)}`
- `199: <TouchableOpacity onPress={handleCheck} disabled={!serviceType} activeOpacity={0.85}`
### backend_consumers_or_contracts
- `2: // app/insurance/coverage-check.tsx — Connected to GET /insurance/coverage-check`
- `20: // Connected to GET /insurance/coverage-check`
- `34: const data = await apiFetch(`
- `35: `/insurance/coverage-check?service_type=${serviceType}${providerName ? `&service_key=${providerName}` : ''}``
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useState } from 'react';`
- `4: import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, StatusBar, Alert } from 'react-native';`
- `25: const [step, setStep] = useState<'form' | 'checking' | 'result'>('form');`
- `26: const [serviceType, setServiceType] = useState('');`
- `27: const [providerName, setProviderName] = useState('');`
- `28: const [result, setResult] = useState<any>(null);`
- `47: <View style={[styles.loadingContainer, { backgroundColor: colors.background } ]}>`
- `52: <View key={i} style={styles.loadingStep}>`
- `90: {/* Coverage status */}`
- `160: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
- `212: loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },`
- `213: loadingTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },`
### payment_insurance_relevance
- `2: // app/insurance/coverage-check.tsx — Connected to GET /insurance/coverage-check`
- `9: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `20: // Connected to GET /insurance/coverage-check`
- `22: export default function CoverageCheckScreen() {`
- `35: `/insurance/coverage-check?service_type=${serviceType}${providerName ? `&service_key=${providerName}` : ''}``
- `62: // E2: render ONLY what the API really returns (covered / copay_percent / copay_flat / requires_preauth / names).`
- `63: // The previous version fabricated riyal amounts, deductibles, coinsurance and annual limits that no endpoint provides.`
- `65: const copayPct = typeof result?.copay_percent === 'number' ? result.copay_percent : null;`
- `66: const companyPct = copayPct != null ? 100 - copayPct : null;`
- `67: const copayFlat = typeof result?.copay_flat === 'number' && result.copay_flat > 0 ? result.copay_flat : null;`
- `90: {/* Coverage status */}`
- `103: {/* Real copay split — percentages come from the coverage engine */}`
### error_empty_loading_retry_cancel
- `39: } catch {`
- `47: <View style={[styles.loadingContainer, { backgroundColor: colors.background } ]}>`
- `52: <View key={i} style={styles.loadingStep}>`
- `212: loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },`
- `213: loadingTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },`
- `214: loadingStep: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },`
- `215: loadingStepIcon: { fontSize: 14 },`
- `216: loadingStepText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '400' },`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
