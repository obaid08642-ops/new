# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/family/permission-request.tsx`
- **Member SHA-256:** `648b8d83c6f210f1c592d83fb14371a89e0ab65adc7ac26ba2a5f9c7bc92a817`
- **Line count:** 167
- **Read range:** `1-167`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router, useLocalSearchParams } from 'expo-router';`
- `13: export default function PermissionRequestScreen() {`
- `48: const submitResponse = async (decision: 'approved' | 'rejected') => {`
- `63: setTimeout(() => router.back(), 1500);`
- `66: const handleAccept = () => submitResponse('approved');`
- `67: const handleReject = () => submitResponse('rejected');`
- `88: <IconButton icon="back" bg="rgba(255,255,255,0.18)" color="#fff" onPress={() => router.back()} />`
- `134: onPress={() => togglePerm(perm.key)}`
- `150: <Button label="قبول الصلاحيات" variant="gradient" icon="check_circle" onPress={handleAccept} full={false} style={{ flex: 1 }}/>`
- `151: <Button label="رفض الكل" variant="outline" icon="close" onPress={handleReject} full={false} style={{ flex: 1 }}/>`
### backend_consumers_or_contracts
- `24: apiFetch('/family/permissions/pending')`
- `52: await apiFetch(`/family/permissions/respond/${requestInfo._id || requestInfo.id}`, {`
### auth_ownership
- `11: // Connected to GET /family/permissions/pending`
- `13: export default function PermissionRequestScreen() {`
- `19: const [permissions, setPermissions] = useState<any[]>([]);`
- `24: apiFetch('/family/permissions/pending')`
- `30: const mapped = (req.permissions || []).map((p: string) => ({`
- `37: setPermissions(mapped);`
- `45: setPermissions(prev => prev.map(p => p.key === key ? { ...p, granted: !p.granted } : p));`
- `51: const granted = permissions.filter(p => p.granted).map(p => p.key);`
- `52: await apiFetch(`/family/permissions/respond/${requestInfo._id || requestInfo.id}`, {`
- `54: body: JSON.stringify({ decision, note: '', permissions: decision === 'approved' ? granted : [] })`
- `116: {/* Permissions list */}`
- `119: {permissions.map((perm, i) => (`
### state_transitions
- `2: import React, { useState } from 'react';`
- `3: import { View, StyleSheet, ScrollView, StatusBar, Alert } from 'react-native';`
- `11: // Connected to GET /family/permissions/pending`
- `18: const [requestInfo, setRequestInfo] = useState<any>(null);`
- `19: const [permissions, setPermissions] = useState<any[]>([]);`
- `20: const [responded, setResponded] = useState(false);`
- `21: const [loading, setLoading] = useState(true);`
- `24: apiFetch('/family/permissions/pending')`
- `41: .finally(() => setLoading(false));`
- `48: const submitResponse = async (decision: 'approved' | 'rejected') => {`
- `54: body: JSON.stringify({ decision, note: '', permissions: decision === 'approved' ? granted : [] })`
- `58: console.error(e);`
### payment_insurance_relevance
- `8: import { AppText, Card, Badge, Button, IconButton, SectionHeader } from '../../src/components/ui';`
- `99: <Card style={{ flexDirection: 'row-reverse', gap: 12, alignItems: 'center' }}>`
- `108: </Card>`
- `117: <Card>`
- `138: </Card>`
- `140: <Card style={{ backgroundColor: colors.infoSurface }}>`
- `145: </Card>`
### error_empty_loading_retry_cancel
- `11: // Connected to GET /family/permissions/pending`
- `21: const [loading, setLoading] = useState(true);`
- `24: apiFetch('/family/permissions/pending')`
- `41: .finally(() => setLoading(false));`
- `57: } catch (e) {`
- `58: console.error(e);`
- `63: setTimeout(() => router.back(), 1500);`
- `94: {loading ? <AppText align="center">جاري التحميل...</AppText> : null}`
- `95: {!loading && !requestInfo ? <AppText align="center">لا يوجد طلب</AppText> : null}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
