# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/booking-confirm.tsx`
- **Member SHA-256:** `7c47744bd49e27de445602514a33f1cdaffb2d54373b3f9879484a647c83a686`
- **Line count:** 472
- **Read range:** `1-472`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router, useLocalSearchParams } from 'expo-router';`
- `26: export default function BookingConfirmScreen() {`
- `164: // Guests CAN book — only paying via INSURANCE requires a registered account.`
- `171: // 1. Prefer the exact slot picked on the booking screen (full ISO).`
- `216: router.replace({`
- `220: paymentUrl: txn.checkout_url || '',`
- `221: bookingId: appt.id,`
- `222: bookingKind: 'consultation',`
- `230: body: JSON.stringify({ booking_id: appt.id, booking_kind: 'consultation' }),`
- `234: router.replace({ pathname: '/insurance/payment-split', params: { request_id: insuranceRequest.id } });`
- `241: router.replace({`
- `242: pathname: '/consultations/booking-success',`
### backend_consumers_or_contracts
- `46: const list = await apiFetch('/insurance/companies');`
- `61: const nets = await apiFetch(`/insurance/companies/${insCompany}/networks`);`
- `122: const baseUrl = API_BASE_URL.replace('https://api.nabdahplus.com/v1', `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8002'}/api/v1`);`
- `123: const res = await fetch(`${baseUrl}/insurance/coverage-check?provider_id=${params.doctorId}&service_type=consultation`, {`
- `183: // 2. Call backend /care/appointments`
- `184: const appt = await apiFetch<any>('/care/appointments', {`
- `228: const insuranceRequest = await apiFetch<any>('/insurance/requests', {`
- `234: router.replace({ pathname: '/insurance/payment-split', params: { request_id: insuranceRequest.id } });`
- `315: video → card only · home → card/insurance · clinic → cash/card/insurance */}`
- `350: <Button label="تعديل بيانات التأمين" variant="ghost" icon="edit" onPress={() => router.push('/profile/insurance')} />`
### auth_ownership
- `115: let token = null;`
- `117: token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);`
- `119: token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);`
- `121: if (!token) return;`
- `125: 'Authorization': `Bearer ${token}`,`
### state_transitions
- `2: import React, { useState, useEffect } from 'react';`
- `3: import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Image } from 'react-native';`
- `30: const [visitType, setVisitType] = useState((params.visitType as string) || 'clinic');`
- `31: const [payMethod, setPayMethod] = useState('card');`
- `32: const [loading, setLoading] = useState(false);`
- `33: const [showInsurance, setShowInsurance] = useState(false);`
- `34: const [insCompany, setInsCompany] = useState('');`
- `35: const [insCategory, setInsCategory] = useState('');`
- `38: const [insCompanies, setInsCompanies] = useState<any[]>([]);`
- `39: const [insCategories, setInsCategories] = useState<any[]>([]);`
- `40: const [insuranceCatalogUnavailable, setInsuranceCatalogUnavailable] = useState(false);`
- `67: const [coverage, setCoverage] = useState<any>(null);`
### payment_insurance_relevance
- `10: import { AppText, Card, Badge, Button, IconButton, SegmentedControl, SectionHeader } from '../../src/components/ui';`
- `14: import { paymentIntentHeaders } from '../../src/utils/payment-idempotency';`
- `31: const [payMethod, setPayMethod] = useState('card');`
- `33: const [showInsurance, setShowInsurance] = useState(false);`
- `36: // Unified insurance catalog from the backend (single source of truth used`
- `40: const [insuranceCatalogUnavailable, setInsuranceCatalogUnavailable] = useState(false);`
- `43: if (!showInsurance) return;`
- `46: const list = await apiFetch('/insurance/companies');`
- `49: setInsuranceCatalogUnavailable(companies.length === 0);`
- `52: setInsuranceCatalogUnavailable(true);`
- `55: }, [showInsurance]);`
- `61: const nets = await apiFetch(`/insurance/companies/${insCompany}/networks`);`
### error_empty_loading_retry_cancel
- `32: const [loading, setLoading] = useState(false);`
- `50: } catch {`
- `63: } catch { setInsCategories([]); }`
- `68: const [loadingCoverage, setLoadingCoverage] = useState(false);`
- `88: .catch(() => null);`
- `107: .catch(() => {});`
- `113: setLoadingCoverage(true);`
- `118: } catch {`
- `132: } catch (err) {`
- `133: console.log('Error checking coverage', err);`
- `135: setLoadingCoverage(false);`
- `169: setLoading(true);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
