# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/pharmacy/barcode-scanner.tsx`
- **Member SHA-256:** `061cde61ee72280fff16ae0bd2dc30e8fee5c0a4f349ff30ab3875ac59fe687d`
- **Line count:** 239
- **Read range:** `1-239`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router } from 'expo-router';`
- `13: export default function BarcodeScannerScreen() {`
- `48: router.push({ pathname: '/pharmacy/product-detail', params: { id: m.id || m._id, name: pickLocalized(m.name_ar, m.name_en) } });`
- `50: router.push({ pathname: '/search', params: { q: name } });`
- `97: router.push({ pathname: '/pharmacy/product-detail', params: { id: result.id || result.barcode, name: result.name } });`
- `108: <IconButton icon="back" bg="rgba(255,255,255,0.18)" color="#fff" onPress={() => router.back()} />`
- `120: <Button label="منح إذن الكاميرا" variant="gradient" icon="photo_camera" onPress={requestPermission} style={{ marginTop: 16 }} />`
- `150: onPress={captureAndIdentify}`
- `160: <TouchableOpacity onPress={() => router.push('/pharmacy/drug-not-found')} style={{ marginTop: 16 }}>`
- `195: <Button label="عرض التفاصيل وإضافة للسلة" variant="gradient" icon="shopping_cart" onPress={handleAddToCart} />`
- `196: <Button label="مسح دواء آخر" variant="outline" icon="qr_code_scanner" onPress={reset} />`
- `213: <Button label="التعرف بالذكاء الاصطناعي (تصوير العبوة)" variant="gradient" icon="document_scanner" onPress={() => { setNotFound(null); busyRef.current = false; }} />`
### backend_consumers_or_contracts
- `48: router.push({ pathname: '/pharmacy/product-detail', params: { id: m.id || m._id, name: pickLocalized(m.name_ar, m.name_en) } });`
- `97: router.push({ pathname: '/pharmacy/product-detail', params: { id: result.id || result.barcode, name: result.name } });`
- `160: <TouchableOpacity onPress={() => router.push('/pharmacy/drug-not-found')} style={{ marginTop: 16 }}>`
- `214: <Button label="إضافة الدواء يدوياً" variant="outline" icon="add" onPress={() => router.push('/pharmacy/drug-not-found')} />`
### auth_ownership
- `6: import { CameraView, useCameraPermissions } from 'expo-camera';`
- `16: const [permission, requestPermission] = useCameraPermissions();`
- `113: {!permission ? (`
- `115: ) : !permission.granted ? (`
- `120: <Button label="منح إذن الكاميرا" variant="gradient" icon="photo_camera" onPress={requestPermission} style={{ marginTop: 16 }} />`
### state_transitions
- `2: import React, { useRef, useState } from 'react';`
- `3: import { View, StyleSheet, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';`
- `17: const [result, setResult] = useState<any>(null);`
- `18: const [notFound, setNotFound] = useState<string | null>(null);`
- `19: const [lookingUp, setLookingUp] = useState(false);`
- `20: const [aiBusy, setAiBusy] = useState(false);`
- `21: const [aiError, setAiError] = useState<string | null>(null);`
- `29: setAiError(null);`
- `34: if (!photo?.base64) throw new Error('capture_failed');`
- `41: setAiError('لم نتمكن من التعرف على العبوة — قرّب الكاميرا من اسم الدواء وحاول مجدداً');`
- `53: setAiError('تعذّر تحليل الصورة — تحقق من الاتصال وحاول مجدداً');`
- `102: <StatusBar barStyle="light-content" />`
### payment_insurance_relevance
- `10: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `72: price: typeof m.price === 'number' && m.price > 0 ? m.price : null,`
- `167: <Card style={{ gap: 12, marginTop: 40 }}>`
- `188: {result.price !== null && <AppText variant="h4" color={colors.primary}>{result.price} ر.س</AppText>}`
- `198: </Card>`
- `202: <Card style={{ gap: 12, marginTop: 40 }}>`
- `217: </Card>`
### error_empty_loading_retry_cancel
- `21: const [aiError, setAiError] = useState<string | null>(null);`
- `29: setAiError(null);`
- `34: if (!photo?.base64) throw new Error('capture_failed');`
- `41: setAiError('لم نتمكن من التعرف على العبوة — قرّب الكاميرا من اسم الدواء وحاول مجدداً');`
- `52: } catch {`
- `53: setAiError('تعذّر تحليل الصورة — تحقق من الاتصال وحاول مجدداً');`
- `79: } catch {`
- `149: loading={aiBusy}`
- `153: {aiError && (`
- `154: <AppText variant="caption" color="#FCA5A5" align="center" style={{ marginTop: 8 }}>{aiError}</AppText>`
- `185: <Badge label={result.available ? 'متوفر' : 'غير متوفر'} color={result.available ? colors.success : colors.error} />`
- `204: <View style={[st.foundIcon, { backgroundColor: colors.errorSurface } ]}>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
