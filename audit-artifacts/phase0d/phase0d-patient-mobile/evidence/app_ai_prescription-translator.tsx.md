# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/ai/prescription-translator.tsx`
- **Member SHA-256:** `b8ab5a6b7ab87e466e5aa40a1355b7627c77b50e267b18208962762e2cb56f67`
- **Line count:** 291
- **Read range:** `1-291`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router } from 'expo-router';`
- `26: export default function PrescriptionTranslatorScreen() {`
- `57: if (!result.canceled && result.assets && result.assets.length > 0) {`
- `76: { text: 'التقاط صورة بالكاميرا', onPress: () => pickImage(true) },`
- `77: { text:'اختيار من المعرض', onPress: () => pickImage(false) },`
- `78: { text: 'إلغاء', style: 'cancel' }`
- `80: { cancelable: true }`
- `138: <IconButton icon="back" bg="rgba(255,255,255,0.18)" color="#fff" onPress={() => router.back()} />`
- `143: {/* Upload area */}`
- `145: <TouchableOpacity activeOpacity={0.9} onPress={handleSelectImage} style={[st.uploadArea, { borderColor: colors.primary, backgroundColor: colors.primarySurface } ]}>`
- `149: <Button label="ابدأ الترجمة" variant="gradient" icon="robot" loading={translating} onPress={handleSelectImage} />`
- `183: <Card key={i} onPress={() => setExpandedMed(expandedMed === i ? null : i)}>`
### backend_consumers_or_contracts
- `239: <Button label={med.price != null ? `اطلب — ${med.price} ر.س` : 'اطلب من الصيدلية'} variant="primary" icon="shopping_cart" size="sm" full={false} onPress={() => router.push('/(tabs)/pharmacy')} style={{ flex: 1 }} />`
- `240: <Button label="تفاصيل" variant="outline" icon="info" size="sm" full={false} onPress={() => router.push('/pharmacy/product-detail')} style={{ flex: 1 }} />`
- `248: <TouchableOpacity onPress={() => router.push('/(tabs)/pharmacy')} style={{ borderRadius: 18, overflow: 'hidden' }}>`
### auth_ownership
- `36: const permissionResult = useCamera`
- `37: ? await ImagePicker.requestCameraPermissionsAsync()`
- `38: : await ImagePicker.requestMediaLibraryPermissionsAsync();`
- `40: if (!permissionResult.granted) {`
### state_transitions
- `2: import React, { useState } from 'react';`
- `3: import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';`
- `29: const [translating, setTranslating] = useState(false);`
- `30: const [translated, setTranslated] = useState(false);`
- `31: const [expandedMed, setExpandedMed] = useState<number | null>(null);`
- `32: const [translatedResult, setTranslatedResult] = useState<any>(null);`
- `57: if (!result.canceled && result.assets && result.assets.length > 0) {`
- `66: console.log('Error picking image', e);`
- `78: { text: 'إلغاء', style: 'cancel' }`
- `80: { cancelable: true }`
- `119: throw new Error(res?.error || 'Failed translation');`
- `122: console.log('Prescription translation error:', err);`
### payment_insurance_relevance
- `9: import { AppText, Card, Badge, Button, IconButton, SectionHeader } from '../../src/components/ui';`
- `105: price: (typeof med.price === 'number' && med.price > 0) ? med.price : null,`
- `157: <Card style={{ backgroundColor: colors.successSurface }}>`
- `166: </Card>`
- `169: <Card style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>`
- `177: </Card>`
- `183: <Card key={i} onPress={() => setExpandedMed(expandedMed === i ? null : i)}>`
- `239: <Button label={med.price != null ? `اطلب — ${med.price} ر.س` : 'اطلب من الصيدلية'} variant="primary" icon="shopping_cart" size="sm" full={false} onPress={() => router.push('/(tabs)/pharmacy')} style={{ flex: 1 }} />`
- `244: </Card>`
- `264: <Card onPress={() => { setTranslated(false); setExpandedMed(null); }} style={{ alignItems: 'center', gap: 8, borderStyle: 'dashed', borderWidth: 2, borderColor: colors.primary }}>`
- `267: </Card>`
### error_empty_loading_retry_cancel
- `57: if (!result.canceled && result.assets && result.assets.length > 0) {`
- `65: } catch (e) {`
- `66: console.log('Error picking image', e);`
- `78: { text: 'إلغاء', style: 'cancel' }`
- `80: { cancelable: true }`
- `119: throw new Error(res?.error || 'Failed translation');`
- `121: } catch (err: any) {`
- `122: console.log('Prescription translation error:', err);`
- `149: <Button label="ابدأ الترجمة" variant="gradient" icon="robot" loading={translating} onPress={handleSelectImage} />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
