# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/diagnostics/insurance-upload.tsx`
- **Member SHA-256:** `fea1029240afa878585e6cd6362341880827c6b80df633c38bdeedfc3d558a2a`
- **Line count:** 426
- **Read range:** `1-426`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { useRouter, Stack } from 'expo-router';`
- `20: export default function InsuranceUpload() {`
- `21: const router = useRouter();`
- `29: const [uploadedImg, setUploadedImg] = useState<string | null>(null);`
- `114: if (!result.canceled && result.assets && result.assets.length > 0) {`
- `116: setUploadedImg(asset.uri);`
- `155: <Stack.Screen options={{ headerShown: false }} />`
- `160: <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>`
- `168: <Animated.View entering={FadeInDown.duration(400)} style={styles.uploadSection}>`
- `174: style={[styles.uploadBox, { backgroundColor: colors.surface, borderColor: colors.primary }]}`
- `175: onPress={() => setShowBottomSheet(true)}`
- `177: <View style={[styles.uploadIconWrap, { backgroundColor: `${colors.primary}15` }]} >`
### backend_consumers_or_contracts
- `47: const res = await apiFetch('/providers?type=lab');`
- `55: const res = await apiFetch('/insurance/companies');`
- `73: const res = await apiFetch(`/insurance/companies/${selCompany}/networks`);`
- `124: const res = await apiFetch('/ai/ocr-translate', {`
- `358: const res = await apiFetch('/orders/create', {`
- `364: pathname: '/diagnostics/insurance-approval',`
### auth_ownership
- `89: const { status } = await ImagePicker.requestCameraPermissionsAsync();`
- `101: const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();`
- `354: providerId: selLab,`
### state_transitions
- `2: import React, { useState } from 'react';`
- `3: import { StyleSheet, View, Text, TouchableOpacity, ScrollView, FlatList, TextInput, Image, ActivityIndicator, Platform, Alert, StatusBar, KeyboardAvoidingView, Modal, I18nManager, Dimensions } from 'react-native';`
- `25: const [step, setStep] = useState<1 | 2 | 3>(1);`
- `26: const [showBottomSheet, setShowBottomSheet] = useState(false);`
- `27: const [showInsPicker, setShowInsPicker] = useState(false);`
- `29: const [uploadedImg, setUploadedImg] = useState<string | null>(null);`
- `32: const [selCompany, setSelCompany] = useState<string>('');`
- `33: const [selClass, setSelClass] = useState<string>('');`
- `35: const [visitType, setVisitType] = useState<'clinic' | 'home'>('clinic');`
- `36: const [selLab, setSelLab] = useState<string | null>(null);`
- `37: const [nearbyLabs, setNearbyLabs] = useState<any[]>([]);`
- `38: const [ocrItems, setOcrItems] = useState<string[] | null>(null);`
### payment_insurance_relevance
- `20: export default function InsuranceUpload() {`
- `23: const { items, setPrescriptionUrl, setPaymentType } = useDiagnosticsCart();`
- `42: const [insuranceCatalogUnavailable, setInsuranceCatalogUnavailable] = useState(false);`
- `55: const res = await apiFetch('/insurance/companies');`
- `58: setInsuranceCatalogUnavailable(list.length === 0);`
- `60: console.log('Error fetching insurance companies', e);`
- `62: setInsuranceCatalogUnavailable(true);`
- `73: const res = await apiFetch(`/insurance/companies/${selCompany}/networks`);`
- `251: {/* Insurance details from profile */}`
- `286: {insuranceCatalogUnavailable && <AppText style={{ color: colors.textSecondary, paddingVertical: 8 }}>كتالوج التأمين غير متاح حالياً. يرجى إعادة المحاولة لاحقاً.</AppText>}`
- `319: style={[styles.labCard, { borderColor: selLab === lab.id ? colors.primary : colors.border, backgroundColor: selLab === lab.id ? `${colors.primary}05` : colors.surface }]}`
- `345: setPaymentType('insurance');`
### error_empty_loading_retry_cancel
- `39: const [ocrFailed, setOcrFailed] = useState(false);`
- `49: } catch (e) {`
- `50: console.log('Error fetching labs', e);`
- `59: } catch (e) {`
- `60: console.log('Error fetching insurance companies', e);`
- `75: } catch {`
- `114: if (!result.canceled && result.assets && result.assets.length > 0) {`
- `122: setOcrFailed(false);`
- `135: setOcrFailed(true);`
- `137: } catch (e) {`
- `138: console.error(e);`
- `139: setOcrFailed(true);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
