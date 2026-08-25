# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/insurance/add-policy.tsx`
- **Member SHA-256:** `57c84ef784eb079668c10c913919e60152163f8586a9b3d92f645032759fa24a`
- **Line count:** 203
- **Read range:** `1-203`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router } from 'expo-router';`
- `14: export default function AddPolicyScreen() {`
- `42: if (shot.canceled || !shot.assets?.[0]?.base64) return;`
- `91: router.replace('/insurance/hub');`
- `103: <TouchableOpacity onPress={() => router.back()}>`
- `110: onPress={handleScanCard}`
- `140: <TouchableOpacity key={c.id} onPress={() => setCompany(c.id)}`
- `168: <TouchableOpacity onPress={handleSave} disabled={!company || !policyNum || isSaving}`
### backend_consumers_or_contracts
- `29: apiFetch('/insurance/companies')`
- `44: const res = await apiFetch('/insurance/ocr-extract', {`
- `78: await apiFetch('/insurance/save-policy', {`
- `91: router.replace('/insurance/hub');`
### auth_ownership
- `36: const perm = await ImagePicker.requestCameraPermissionsAsync();`
### state_transitions
- `2: import React, { useState } from 'react';`
- `18: const [company, setCompany] = useState('');`
- `19: const [policyNum, setPolicyNum] = useState('');`
- `20: const [memberId, setMemberId] = useState('');`
- `21: const [memberName, setMemberName] = useState('');`
- `22: const [expiry, setExpiry] = useState('');`
- `23: const [ocrUsed, setOcrUsed] = useState(false);`
- `24: const [isSaving, setIsSaving] = useState(false);`
- `25: const [isScanning, setIsScanning] = useState(false);`
- `26: const [companies, setCompanies] = useState<any[]>([]);`
- `42: if (shot.canceled || !shot.assets?.[0]?.base64) return;`
- `48: if (res.success && res.extracted_data) {`
### payment_insurance_relevance
- `8: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `29: apiFetch('/insurance/companies')`
- `34: const handleScanCard = async () => {`
- `44: const res = await apiFetch('/insurance/ocr-extract', {`
- `78: await apiFetch('/insurance/save-policy', {`
- `91: router.replace('/insurance/hub');`
- `108: {/* Scan Card Option */}`
- `110: onPress={handleScanCard}`
- `112: style={[styles.scanCard, { backgroundColor: isDark ? colors.surface : '#EBF3FF', borderColor: colors.primary + '40' } ]}>`
- `133: <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>`
- `149: <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>`
- `184: scanCard: { borderRadius: 18, borderWidth: 1.5, padding: 16, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },`
### error_empty_loading_retry_cancel
- `31: .catch(() => setCompanies([]));`
- `42: if (shot.canceled || !shot.assets?.[0]?.base64) return;`
- `66: } catch (err: any) {`
- `92: } catch (err: any) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
