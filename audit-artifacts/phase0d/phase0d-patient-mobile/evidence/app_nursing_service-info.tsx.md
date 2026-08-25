# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/nursing/service-info.tsx`
- **Member SHA-256:** `0bc04aeb999508e95ab4289f192cdf031533fcd735ba1ccf400be3d1df4f71eb`
- **Line count:** 157
- **Read range:** `1-157`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: import { useRouter, useLocalSearchParams } from 'expo-router';`
- `17: const router = useRouter();`
- `40: <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>`
- `55: const goBook = () => router.push({`
- `72: <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + 8 }]}>`
- `134: <TouchableOpacity style={styles.bookBtn} onPress={goBook} activeOpacity={0.9}>`
- `136: <LocalizedText style={styles.bookBtnText}>احجز الآن</LocalizedText>`
- `155: bookBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: '#23B5CE', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 16 },`
- `156: bookBtnText: { fontFamily: 'Cairo-Black', fontSize: 16, color: '#fff' },`
### backend_consumers_or_contracts
- `27: apiFetch(`/home-care/services/${serviceId}`)`
- `56: pathname: '/nursing/service-details',`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `4: import React, { useEffect, useState } from 'react';`
- `23: const [svc, setSvc] = useState<any>(null);`
- `24: const [loading, setLoading] = useState(true);`
- `29: .catch(console.error)`
- `30: .finally(() => setLoading(false));`
- `33: if (loading) {`
### payment_insurance_relevance
- `3: // price/duration, and a prominent "احجز الآن" that continues to nurse selection.`
- `57: params: { serviceId, title, flow: flow || 'cash', gender: gender || 'any', availability: availability || 'any', nationality: nationality || 'any', search: search || '' },`
- `82: {svc.price != null && (`
- `84: <Icon name="cash-multiple" size={18} color="#10B981" />`
- `85: <LocalizedText style={styles.factText}>{svc.price} ر.س</LocalizedText>`
- `94: {svc.insurance_availability ? (`
- `102: {/* Description — same data shown on the card, in full */}`
- `104: <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>`
- `105: <LocalizedText style={[styles.cardTitle, { color: colors.textPrimary }]}>وصف الخدمة</LocalizedText>`
- `106: <LocalizedText style={[styles.cardBody, { color: colors.textSecondary }]}>{desc}</LocalizedText>`
- `112: <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 14 }]}>`
- `115: <LocalizedText style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 0 }]}>التحضيرات والاحتياطات</LocalizedText>`
### error_empty_loading_retry_cancel
- `24: const [loading, setLoading] = useState(true);`
- `29: .catch(console.error)`
- `30: .finally(() => setLoading(false));`
- `33: if (loading) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
