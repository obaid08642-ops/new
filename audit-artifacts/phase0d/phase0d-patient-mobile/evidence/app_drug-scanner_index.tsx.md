# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/drug-scanner/index.tsx`
- **Member SHA-256:** `86ebd18fa847d396f1c5f64839d86f187c9613c290442b4764db4d0cceef3839`
- **Line count:** 263
- **Read range:** `1-263`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { router } from 'expo-router';`
- `19: export default function DrugScannerScreen() {`
- `91: <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>`
- `107: <TouchableOpacity key={med.id} onPress={() => toggleMed(med.id)}`
- `135: <TouchableOpacity key={i} onPress={() => setNewDrug(drug)}`
- `147: <TouchableOpacity onPress={handleScan} activeOpacity={0.85}>`
- `199: <TouchableOpacity onPress={() => router.push('/(tabs)/consultations')}`
- `203: <TouchableOpacity onPress={() => setScanState('idle')}`
### backend_consumers_or_contracts
- `35: apiFetch('/health/medications')`
- `47: const res = await apiFetch('/ai/drug-interactions', {`
### auth_ownership
- `205: <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="refresh" size={16} color={colors.primary} /><AppText variant="bodySM">فحص جديد</AppText></View>`
### state_transitions
- `4: import React, { useState } from 'react';`
- `6: View, StyleSheet, ScrollView, TouchableOpacity, StatusBar,`
- `17: type ScanState = 'idle' | 'scanning' | 'results';`
- `24: const [scanState, setScanState] = useState<ScanState>('idle');`
- `25: const [selectedMeds, setSelectedMeds] = useState<string[]>([]);`
- `26: const [newDrug, setNewDrug] = useState('');`
- `28: const [myMedicines, setMyMedicines] = useState<any[]>([]);`
- `29: const [interactions, setInteractions] = useState<any[]>([]);`
- `30: const [safeInteractions, setSafeInteractions] = useState<string[]>([]);`
- `41: .catch(console.error);`
- `45: setScanState('scanning');`
- `54: setScanState('results');`
### payment_insurance_relevance
- `13: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `104: <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>`
- `130: <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>`
- `159: <View style={[styles.summaryCard, { backgroundColor: '#FEE2E2' } ]}>`
- `167: <View key={i} style={[styles.interactionCard, { backgroundColor: isDark ? colors.surface : colors.white, borderRightWidth: 4, borderRightColor: interaction.color } ]}>`
- `190: <View style={[styles.safeCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>`
- `228: card: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },`
- `229: cardTitle: { fontSize: 14, fontWeight: '800', textAlign: 'right', marginBottom: 12 },`
- `230: cardSub: { fontSize: 12, fontWeight: '400', textAlign: 'right', marginBottom: 10 },`
- `243: summaryCard: { borderRadius: 16, padding: 14 },`
- `247: interactionCard: { borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, gap: 8 },`
- `258: safeCard: { borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },`
### error_empty_loading_retry_cancel
- `41: .catch(console.error);`
- `55: } catch {`
- `70: <View style={styles.loadingContainer}>`
- `76: <View key={i} style={styles.loadingStep}>`
- `217: loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },`
- `218: loadingTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },`
- `219: loadingSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '400' },`
- `220: loadingStep: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },`
- `221: loadingStepCheck: { fontSize: 14 },`
- `222: loadingStepText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '400' },`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
