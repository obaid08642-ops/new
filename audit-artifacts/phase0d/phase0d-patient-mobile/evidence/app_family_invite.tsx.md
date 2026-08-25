# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/family/invite.tsx`
- **Member SHA-256:** `4ba35458d0a31cd7cf159647e6c4c1c67e2f828cae8b316217e7b04aecd6a276`
- **Line count:** 157
- **Read range:** `1-157`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router } from 'expo-router';`
- `12: export default function FamilyInviteScreen() {`
- `57: <IconButton icon="back" onPress={() => router.back()} />`
- `70: <TouchableOpacity onPress={loadInviteCode} style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.primary }}>`
- `99: <TouchableOpacity onPress={copyCode}>`
- `103: <Button label="مشاركة الرابط" variant="gradient" icon="share" onPress={shareLink} />`
- `124: <TouchableOpacity onPress={copyCode} style={{ flexDirection: 'row-reverse', gap: 6, alignItems: 'center' }}>`
### backend_consumers_or_contracts
- `31: const res = await apiFetch('/family/invite', { method: 'POST' });`
### auth_ownership
- `133: {/* Permissions preview */}`
### state_transitions
- `2: import React, { useState, useEffect } from 'react';`
- `3: import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Share, ActivityIndicator } from 'react-native';`
- `15: const [method, setMethod] = useState('link');`
- `16: const [name, setName] = useState('');`
- `17: const [relation, setRelation] = useState('');`
- `18: const [copied, setCopied] = useState(false);`
- `19: const [inviteCode, setInviteCode] = useState('');`
- `20: const [loadError, setLoadError] = useState(false);`
- `21: const [loading, setLoading] = useState(true);`
- `29: setLoading(true);`
- `30: setLoadError(false);`
- `34: console.error(err);`
### payment_insurance_relevance
- `8: import { AppText, Card, Badge, Button, IconButton, Input, SegmentedControl, SectionHeader } from '../../src/components/ui';`
- `77: <Card>`
- `84: </Card>`
- `87: <Card>`
- `131: </Card>`
- `134: <Card style={{ backgroundColor: colors.infoSurface }}>`
- `142: </Card>`
### error_empty_loading_retry_cancel
- `20: const [loadError, setLoadError] = useState(false);`
- `21: const [loading, setLoading] = useState(true);`
- `29: setLoading(true);`
- `30: setLoadError(false);`
- `33: } catch (err: any) {`
- `34: console.error(err);`
- `36: setLoadError(true);`
- `38: setLoading(false);`
- `46: } catch {}`
- `49: const copyCode = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };`
- `60: {loading ? (`
- `64: ) : loadError ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
