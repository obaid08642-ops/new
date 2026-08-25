# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/pharmacy/manual-order.tsx`
- **Member SHA-256:** `9d2f1f8a8fcbeeae52a0f45c51bcd58b77ea6ee45a39e2d2757a32a7888886e8`
- **Line count:** 141
- **Read range:** `1-141`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router } from 'expo-router';`
- `12: export default function ManualOrderScreen() {`
- `30: if (!result.canceled) {`
- `47: router.push('/pharmacy/cart');`
- `56: <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.s } ]}>`
- `95: {/* Photo Upload */}`
- `100: <TouchableOpacity style={[styles.removeBtn, { backgroundColor: '#F0695C' }]} onPress={() => setPhoto(null)}>`
- `105: <TouchableOpacity style={[styles.uploadBox, { backgroundColor: colors.s, borderColor: '#23B5CE' }]} onPress={pickImage}>`
- `115: style={[styles.submitBtn, { backgroundColor: medName.length > 2 ? '#23B5CE' : colors.bd }]}`
- `116: onPress={handleAddToCart}`
- `135: uploadBox: { height: 120, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginTop: 4 },`
- `140: submitBtn: { padding: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#23B5CE', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }`
### backend_consumers_or_contracts
- `47: router.push('/pharmacy/cart');`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState } from 'react';`
- `20: const [medName, setMedName] = useState('');`
- `21: const [medDesc, setMedDesc] = useState('');`
- `22: const [photo, setPhoto] = useState<string | null>(null);`
- `30: if (!result.canceled) {`
### payment_insurance_relevance
- `40: price: 0, // Price will be updated by pharmacy later`
### error_empty_loading_retry_cancel
- `30: if (!result.canceled) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
