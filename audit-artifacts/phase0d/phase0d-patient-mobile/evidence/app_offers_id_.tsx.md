# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/offers/[id].tsx`
- **Member SHA-256:** `3661ad59748d4e438acceaf0673554b3ff8fdc7526644ed10d63cb544ab0fda8`
- **Line count:** 233
- **Read range:** `1-233`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { useLocalSearchParams, useRouter } from 'expo-router';`
- `14: export default function OfferDetailsScreen() {`
- `16: const router = useRouter();`
- `59: const handleBookProvider = (p: any) => {`
- `60: // Providers from this endpoint are provider_profiles; doctors open the booking flow`
- `62: router.push({ pathname: '/consultations/book/[id]', params: { id: p.id } } as any);`
- `80: {loadError && <Button label="إعادة المحاولة" variant="primary" icon="refresh" onPress={load} />}`
- `81: <Button label="العودة" variant="ghost" onPress={() => router.back()} />`
- `101: <IconButton icon="share" bg="rgba(255,255,255,0.25)" color="#fff" onPress={handleShare} />`
- `102: <IconButton icon="back" bg="rgba(255,255,255,0.25)" color="#fff" onPress={() => router.back()} />`
- `176: {/* Bookable providers for this offer */}`
- `187: onPress={() => handleBookProvider(p)}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `80: {loadError && <Button label="إعادة المحاولة" variant="primary" icon="refresh" onPress={load} />}`
### state_transitions
- `3: import React, { useState, useEffect } from 'react';`
- `4: import { View, StyleSheet, ScrollView, Image, TouchableOpacity, StatusBar, Share, ActivityIndicator } from 'react-native';`
- `19: const [offer, setOffer] = useState<any>(null);`
- `20: const [providers, setProviders] = useState<any[]>([]);`
- `21: const [loading, setLoading] = useState(true);`
- `22: const [loadError, setLoadError] = useState(false);`
- `27: if (!offerId) { setLoadError(true); setLoading(false); return; }`
- `28: setLoading(true);`
- `29: setLoadError(false);`
- `33: if (!res) setLoadError(true);`
- `35: .catch(() => { setOffer(null); setLoadError(true); })`
- `36: .finally(() => setLoading(false));`
### payment_insurance_relevance
- `2: // app/offers/[id].tsx — تفاصيل العرض: بيانات حقيقية من /offers/:id + مقدمو الخدمة من /promotions/offers/:id/providers`
- `9: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `14: export default function OfferDetailsScreen() {`
- `19: const [offer, setOffer] = useState<any>(null);`
- `24: const offerId = typeof id === 'string' ? id : '';`
- `27: if (!offerId) { setLoadError(true); setLoading(false); return; }`
- `30: apiFetch<any>(`/offers/${offerId}`)`
- `32: setOffer(res || null);`
- `35: .catch(() => { setOffer(null); setLoadError(true); })`
- `37: apiFetch<any>(`/promotions/offers/${offerId}/providers`)`
- `40: }, [offerId]);`
- `44: const title = pickLocalized(offer?.title_ar, offer?.title_en) || '';`
### error_empty_loading_retry_cancel
- `21: const [loading, setLoading] = useState(true);`
- `22: const [loadError, setLoadError] = useState(false);`
- `27: if (!offerId) { setLoadError(true); setLoading(false); return; }`
- `28: setLoading(true);`
- `29: setLoadError(false);`
- `33: if (!res) setLoadError(true);`
- `35: .catch(() => { setOffer(null); setLoadError(true); })`
- `36: .finally(() => setLoading(false));`
- `39: .catch(() => setProviders([]));`
- `56: } catch {}`
- `66: if (loading) {`
- `78: <AppText variant="h5" align="center">{loadError ? 'تعذر تحميل العرض' : 'لم يتم العثور على العرض'}</AppText>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
