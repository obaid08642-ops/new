# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/pharmacy/scan-prescription.tsx`
- **Member SHA-256:** `a4f7cf9619f28dedac29e3e22e2a643e149f679db300a0a88bd7f8b5989bcdbb`
- **Line count:** 375
- **Read range:** `1-375`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import { router } from "expo-router";`
- `23: export default function ScanPrescriptionScreen() {`
- `63: if (!result.canceled && result.assets && result.assets[0].uri) {`
- `88: const savedPrescription = await apiFetch('/prescriptions/upload', {`
- `91: upload_image: `data:image/jpeg;base64,${base64Str}`,`
- `119: router.push(added ? '/pharmacy/cart' : '/pharmacy/rx-order');`
- `142: onPress={() => router.back()}`
- `207: onPress={() => pickImage(true)}`
- `246: onPress={() => pickImage(false)}`
### backend_consumers_or_contracts
- `80: const response = await apiFetch("/ai/prescription-ocr", {`
- `88: const savedPrescription = await apiFetch('/prescriptions/upload', {`
- `119: router.push(added ? '/pharmacy/cart' : '/pharmacy/rx-order');`
### auth_ownership
- `39: const { status } = await ImagePicker.requestCameraPermissionsAsync();`
- `51: await ImagePicker.requestMediaLibraryPermissionsAsync();`
### state_transitions
- `2: import React, { useState } from "react";`
- `31: const [imageUri, setImageUri] = useState<string | null>(null);`
- `32: const [loading, setLoading] = useState(false);`
- `33: const [statusText, setStatusText] = useState("");`
- `39: const { status } = await ImagePicker.requestCameraPermissionsAsync();`
- `40: if (status !== "granted") {`
- `50: const { status } =`
- `52: if (status !== "granted") {`
- `63: if (!result.canceled && result.assets && result.assets[0].uri) {`
- `68: console.log("Error picking image", e);`
- `73: setLoading(true);`
- `74: setStatusText(`
### payment_insurance_relevance
- `108: price: 0,`
### error_empty_loading_retry_cancel
- `32: const [loading, setLoading] = useState(false);`
- `63: if (!result.canceled && result.assets && result.assets[0].uri) {`
- `67: } catch (e) {`
- `68: console.log("Error picking image", e);`
- `73: setLoading(true);`
- `96: if (!savedPrescription?.id) throw new Error('تعذر حفظ الوصفة');`
- `118: setLoading(false);`
- `120: } catch (e) {`
- `121: console.log("OCR Error", e);`
- `123: setLoading(false);`
- `287: {loading && (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
