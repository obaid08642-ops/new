# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/book/[id].tsx`
- **Member SHA-256:** `cdc084345b7fb456716faba3cd583ab70a924a6359ca9d2ac8835d4bcba40d31`
- **Line count:** 385
- **Read range:** `1-385`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: // app/consultations/book/[id].tsx — حجز موعد: اختيار نوع الزيارة واليوم والموعد من الخانات الحقيقية`
- `8: import { router, useLocalSearchParams } from 'expo-router';`
- `31: export default function BookAppointmentScreen() {`
- `158: router.push({`
- `159: pathname: '/consultations/booking-confirm',`
- `192: <Button label="إعادة المحاولة" variant="primary" icon="refresh" onPress={loadDoctor} />`
- `193: <Button label="عودة" variant="ghost" onPress={() => router.back()} />`
- `205: <IconButton icon="back" onPress={() => router.back()} />`
- `241: onPress={() => setVisitType(m)}`
- `267: onPress={() => setDayOffset(i)}`
- `301: onPress={() => setSelectedSlot(s.start)}`
- `329: <TouchableOpacity onPress={() => router.push('/delivery/address-select')}>`
### backend_consumers_or_contracts
- `73: const data = await apiFetch(`/care/doctors/${encodeURIComponent(String(id || ''))}`);`
- `105: const res = await apiFetch(`
### auth_ownership
- `192: <Button label="إعادة المحاولة" variant="primary" icon="refresh" onPress={loadDoctor} />`
### state_transitions
- `3: import React, { useState, useEffect, useCallback, useMemo } from 'react';`
- `5: View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator,`
- `36: const [doctor, setDoctor] = useState<any>(null);`
- `37: const [loadingDoc, setLoadingDoc] = useState(true);`
- `38: const [docError, setDocError] = useState(false);`
- `40: const [visitType, setVisitType] = useState<string>('clinic');`
- `41: const [dayOffset, setDayOffset] = useState(0);`
- `42: const [slots, setSlots] = useState<any[]>([]);`
- `43: const [slotsReason, setSlotsReason] = useState<string | null>(null);`
- `44: const [loadingSlots, setLoadingSlots] = useState(false);`
- `45: const [selectedSlot, setSelectedSlot] = useState<string | null>(null);`
- `46: const [notes, setNotes] = useState('');`
### payment_insurance_relevance
- `12: import { AppText, Card, Button, IconButton, SectionHeader } from '../../../src/components/ui';`
- `25: function priceFor(doc: any, vt: string): number | null {`
- `27: const p = vt === 'clinic' ? doc.price_clinic : vt === 'video' ? doc.price_online : doc.price_home;`
- `138: const price = priceFor(doctor, visitType);`
- `210: <Card style={{ flexDirection: 'row-reverse', gap: 12, alignItems: 'center' }}>`
- `228: </Card>`
- `231: <Card>`
- `236: const p = priceFor(doctor, m);`
- `242: style={[st.visitCard, {`
- `256: </Card>`
- `259: <Card>`
- `268: style={[st.dayCard, {`
### error_empty_loading_retry_cancel
- `37: const [loadingDoc, setLoadingDoc] = useState(true);`
- `38: const [docError, setDocError] = useState(false);`
- `44: const [loadingSlots, setLoadingSlots] = useState(false);`
- `70: setLoadingDoc(true);`
- `71: setDocError(false);`
- `83: setDocError(true);`
- `85: } catch {`
- `87: setDocError(true);`
- `89: setLoadingDoc(false);`
- `100: setLoadingSlots(true);`
- `111: } catch {`
- `114: setSlotsReason('error');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
