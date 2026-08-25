# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/diagnostics/lab-comparison.tsx`
- **Member SHA-256:** `be6969d1332218956a3c235675a57a4a3e45b14afee04e991b3263e9a299699f`
- **Line count:** 272
- **Read range:** `1-272`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: import { useRouter, useLocalSearchParams } from "expo-router";`
- `20: const router = useRouter();`
- `47: const handleBook = async (lab: any) => {`
- `55: { text: "إلغاء", style: "cancel", onPress: () => setAdding(false) },`
- `56: { text: "زيارة الفرع", onPress: () => processAdd(lab, false) },`
- `59: onPress: () => processAdd(lab, true),`
- `82: router.push("/diagnostics/cart");`
- `91: <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>`
- `184: style={styles.bookBtn}`
- `185: onPress={() => handleBook(lab)}`
- `265: bookBtn: {`
### backend_consumers_or_contracts
- `34: apiFetch(`/labs/services/${id}`),`
- `35: apiFetch(`/labs/compatible-providers?testIds=${id}`)`
### auth_ownership
- `76: lockedProviderId: lab.id,`
### state_transitions
- `2: import React, { useState, useEffect } from "react";`
- `23: const [adding, setAdding] = useState(false);`
- `27: const [loading, setLoading] = useState(true);`
- `28: const [labs, setLabs] = useState<any[]>([]);`
- `29: const [basePrice, setBasePrice] = useState(0);`
- `40: setLoading(false);`
- `42: console.error(err);`
- `43: setLoading(false);`
- `55: { text: "إلغاء", style: "cancel", onPress: () => setAdding(false) },`
- `119: {loading ? (`
- `197: {!loading && labs.length === 0 && <AppText style={{ textAlign: 'center', marginTop: 40, color: theme.colors.textSecondary }}>لا يوجد مزوّد متوافق ومفعّل لهذا الفحص حالياً.</AppText>}`
### payment_insurance_relevance
- `29: const [basePrice, setBasePrice] = useState(0);`
- `37: const price = Number((svcRes?.data || svcRes)?.price || 0);`
- `38: setBasePrice(price);`
- `73: price: basePrice,`
- `125: style={styles.labCard}`
- `127: <View style={styles.cardHeader}>`
- `154: <View style={styles.priceCol}>`
- `162: {basePrice || '—'}`
- `167: {basePrice ? 'ر.س (أساسي)' : 'يحدده الخادم'}`
- `172: <View style={styles.cardFooter}>`
- `230: labCard: {`
- `239: cardHeader: {`
### error_empty_loading_retry_cancel
- `27: const [loading, setLoading] = useState(true);`
- `40: setLoading(false);`
- `41: }).catch((err) => {`
- `42: console.error(err);`
- `43: setLoading(false);`
- `55: { text: "إلغاء", style: "cancel", onPress: () => setAdding(false) },`
- `119: {loading ? (`
- `197: {!loading && labs.length === 0 && <AppText style={{ textAlign: 'center', marginTop: 40, color: theme.colors.textSecondary }}>لا يوجد مزوّد متوافق ومفعّل لهذا الفحص حالياً.</AppText>}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
