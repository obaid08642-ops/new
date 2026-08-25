# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/nursing/nurse-profile.tsx`
- **Member SHA-256:** `1f609188f152f22121db7d67d9a5ca810206d724026fec3cd4dcc61f57ddbc13`
- **Line count:** 450
- **Read range:** `1-450`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { useRouter, useLocalSearchParams } from 'expo-router';`
- `10: import { useFocusEffect } from 'expo-router';`
- `26: const router = useRouter();`
- `49: // Real selected/saved address — refreshed whenever the screen regains focus`
- `109: const handleSubmit = async () => {`
- `133: const res = await apiFetch('/home-care/bookings', { method: 'POST', body: JSON.stringify(payload) });`
- `134: const bookingId = res?.id || res?.booking_id;`
- `138: } else if (bookingId) {`
- `139: router.replace({ pathname: '/nursing/live-tracking', params: { type: transportMode, bookingId } });`
- `142: { text: 'حسناً', onPress: () => router.back() },`
- `158: <TouchableOpacity style={styles.successBtn} onPress={() => router.push('/(tabs)')}>`
- `174: <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>`
### backend_consumers_or_contracts
- `88: const nurseData = await apiFetch(`/home-care/providers/${nurseId}`);`
- `92: // Real coverage check (endpoint /home-care/insurance/verify does not exist)`
- `93: const insData = await apiFetch(`/insurance/coverage-check?provider_id=${nurseId}&service_type=home_nursing`).catch(() => null);`
- `133: const res = await apiFetch('/home-care/bookings', { method: 'POST', body: JSON.stringify(payload) });`
- `139: router.replace({ pathname: '/nursing/live-tracking', params: { type: transportMode, bookingId } });`
### auth_ownership
- `49: // Real selected/saved address — refreshed whenever the screen regains focus`
### state_transitions
- `2: import React, { useEffect, useState } from 'react';`
- `31: const [nurse, setNurse] = useState<any>(null);`
- `32: const [insuranceData, setInsuranceData] = useState<any>(null);`
- `33: const [processing, setProcessing] = useState(false);`
- `34: const [insuranceSent, setInsuranceSent] = useState(false);`
- `36: // Scheduling State`
- `37: const [selectedDate, setSelectedDate] = useState('');`
- `38: const [selectedTime, setSelectedTime] = useState('');`
- `41: const [daysCount, setDaysCount] = useState<number>(1);`
- `42: const [frequencyModal, setFrequencyModal] = useState(false);`
- `44: // Transport State`
- `45: const [transportMode, setTransportMode] = useState<'patient'|'nurse'>('nurse');`
### payment_insurance_relevance
- `32: const [insuranceData, setInsuranceData] = useState<any>(null);`
- `34: const [insuranceSent, setInsuranceSent] = useState(false);`
- `91: if (flow === 'insurance') {`
- `92: // Real coverage check (endpoint /home-care/insurance/verify does not exist)`
- `93: const insData = await apiFetch(`/insurance/coverage-check?provider_id=${nurseId}&service_type=home_nursing`).catch(() => null);`
- `94: setInsuranceData(insData);`
- `105: // Financial Calculations — real price only; backend recomputes total from the service record`
- `106: const basePrice = nurse.price;`
- `107: const totalServiceFee = basePrice * daysCount; // estimate shown to the patient`
- `125: const payload = {`
- `131: payment_method: flow === 'insurance' ? 'insurance' : 'card',`
- `133: const res = await apiFetch('/home-care/bookings', { method: 'POST', body: JSON.stringify(payload) });`
### error_empty_loading_retry_cancel
- `93: const insData = await apiFetch(`/insurance/coverage-check?provider_id=${nurseId}&service_type=home_nursing`).catch(() => null);`
- `96: } catch (err) {`
- `97: console.error(err);`
- `145: } catch (err: any) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
