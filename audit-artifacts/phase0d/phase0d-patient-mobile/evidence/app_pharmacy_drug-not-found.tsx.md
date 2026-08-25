# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/pharmacy/drug-not-found.tsx`
- **Member SHA-256:** `5362dfe3eabbe537a53897748876428ab5dd598ec89306a5c2d39d52494b5af3`
- **Line count:** 156
- **Read range:** `1-156`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router } from 'expo-router';`
- `12: export default function DrugNotFoundScreen() {`
- `28: const handleSubmit = async () => {`
- `39: { text: 'إلغاء', style: 'cancel' },`
- `40: { text: 'نعم، ابحث عن بديل', onPress: () => setSent(true) }`
- `62: <Button label="العودة للصيدلية" variant="gradient" icon="medication" onPress={() => router.replace('/(tabs)/pharmacy')} style={{ marginTop: 16, width: '80%' }} />`
- `63: <Button label="إضافة دواء آخر" variant="outline" icon="add" onPress={() => { setSent(false); setName(''); setDose(''); setHasImage(false); }} style={{ width: '80%' }} />`
- `74: <IconButton icon="back" onPress={() => router.back()} />`
- `102: {/* Image upload */}`
- `106: <TouchableOpacity activeOpacity={0.9} onPress={pickImage} style={[st.uploadArea, { borderColor: colors.primary, backgroundColor: colors.primarySurface } ]}>`
- `115: <TouchableOpacity onPress={() => setHasImage(false)}>`
- `142: <Button label="إرسال للصيدلية" variant="gradient" size="lg" icon="send" loading={sending} disabled={!name.trim()} onPress={handleSubmit} />`
### backend_consumers_or_contracts
- `32: const res: any = await apiFetch(`/patient/pharmacy/shortage-flags/lookup?generic_name=${encodeURIComponent(name)}`);`
- `62: <Button label="العودة للصيدلية" variant="gradient" icon="medication" onPress={() => router.replace('/(tabs)/pharmacy')} style={{ marginTop: 16, width: '80%' }} />`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState } from 'react';`
- `3: import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Alert } from 'react-native';`
- `15: const [name, setName] = useState('');`
- `16: const [dose, setDose] = useState('');`
- `17: const [qty, setQty] = useState('1');`
- `18: const [notes, setNotes] = useState('');`
- `19: const [hasImage, setHasImage] = useState(false);`
- `20: const [sending, setSending] = useState(false);`
- `21: const [sent, setSent] = useState(false);`
- `39: { text: 'إلغاء', style: 'cancel' },`
- `55: <View style={[st.successIcon, { backgroundColor: colors.successSurface } ]}>`
- `56: <Icon name="check_circle" size={48} color={colors.success} />`
### payment_insurance_relevance
- `8: import { AppText, Card, Badge, Button, IconButton, Input, SectionHeader } from '../../src/components/ui';`
- `79: <Card style={{ backgroundColor: colors.infoSurface }}>`
- `86: </Card>`
- `89: <Card>`
- `100: </Card>`
- `103: <Card>`
- `120: </Card>`
- `123: <Card>`
- `138: </Card>`
### error_empty_loading_retry_cancel
- `39: { text: 'إلغاء', style: 'cancel' },`
- `46: } catch (e) {`
- `116: <AppText variant="labelSM" color={colors.error}>حذف الصورة</AppText>`
- `142: <Button label="إرسال للصيدلية" variant="gradient" size="lg" icon="send" loading={sending} disabled={!name.trim()} onPress={handleSubmit} />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
