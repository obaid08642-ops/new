# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/pharmacy/rx-order.tsx`
- **Member SHA-256:** `3cc1d5f9ce284fb3f5cca5d3b0cf349ccc307686d3a0d0a664563fbd400777a7`
- **Line count:** 128
- **Read range:** `1-128`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: // app/pharmacy/rx-order.tsx — prescription items are transferred to the live pharmacy cart before checkout.`
- `4: import { router } from 'expo-router';`
- `13: export default function RxOrderScreen() {`
- `20: const [submitting, setSubmitting] = useState(false);`
- `32: const continueToCheckout = async () => {`
- `38: setSubmitting(true);`
- `57: router.replace('/pharmacy/checkout');`
- `61: setSubmitting(false);`
- `71: <IconButton icon="back" onPress={() => router.back()} />`
- `116: <Button label="مراجعة السلة وإتمام الطلب" variant="gradient" size="lg" icon="cart" loading={submitting} disabled={loading || !meds.length} onPress={continueToCheckout} />`
### backend_consumers_or_contracts
- `1: // app/pharmacy/rx-order.tsx — prescription items are transferred to the live pharmacy cart before checkout.`
- `23: apiFetch('/cart/prescription')`
- `57: router.replace('/pharmacy/checkout');`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useEffect, useState } from 'react';`
- `3: import { View, StyleSheet, ScrollView, StatusBar, Alert, ActivityIndicator } from 'react-native';`
- `17: const [meds, setMeds] = useState<any[]>([]);`
- `18: const [rxDetails, setRxDetails] = useState<any>(null);`
- `19: const [loading, setLoading] = useState(true);`
- `20: const [submitting, setSubmitting] = useState(false);`
- `29: .finally(() => setLoading(false));`
- `67: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
- `82: {rxDetails && <Card style={{ backgroundColor: colors.successSurface }}>`
- `84: <Icon name="check_circle" size={22} color={colors.success} />`
- `86: <AppText variant="h6" color={colors.success}>تم العثور على وصفة مرسلة</AppText>`
- `94: {loading ? <ActivityIndicator color={colors.primary} /> : meds.length ? meds.map((med, index) => (`
### payment_insurance_relevance
- `8: import { AppText, Card, Badge, Button, IconButton, SectionHeader } from '../../src/components/ui';`
- `16: const { items, addItem, setPrescriptionUrl, setPaymentType } = useCart();`
- `45: price: Number(med.price || 0),`
- `56: setPaymentType('insurance');`
- `75: <Card style={{ backgroundColor: colors.infoSurface }}>`
- `80: </Card>`
- `82: {rxDetails && <Card style={{ backgroundColor: colors.successSurface }}>`
- `90: </Card>}`
- `92: <Card>`
- `112: </Card>`
### error_empty_loading_retry_cancel
- `19: const [loading, setLoading] = useState(true);`
- `28: .catch(() => setMeds([]))`
- `29: .finally(() => setLoading(false));`
- `58: } catch {`
- `94: {loading ? <ActivityIndicator color={colors.primary} /> : meds.length ? meds.map((med, index) => (`
- `116: <Button label="مراجعة السلة وإتمام الطلب" variant="gradient" size="lg" icon="cart" loading={submitting} disabled={loading || !meds.length} onPress={continueToCheckout} />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
