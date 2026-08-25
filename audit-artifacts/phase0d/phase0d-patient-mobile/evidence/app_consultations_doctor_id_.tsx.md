# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/doctor/[id].tsx`
- **Member SHA-256:** `3cca7a66d0e3bde604349b28a100f85587660867f9b0fe9668f7349d626b23dd`
- **Line count:** 567
- **Read range:** `1-567`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: import { router, useLocalSearchParams } from 'expo-router';`
- `24: const go = (screen: string, title?: string, params?: any) => {`
- `25: if (screen === 's12') {`
- `26: (router.push as any)({`
- `27: pathname: `/consultations/book/[id]`,`
- `30: } else if (screen === 's8') {`
- `31: router.back();`
- `115: message: lang === 'ar' ? `احجز موعد مع ${docName} عبر نبض بلس! الرابط: ${url}` : `Book an appointment with ${docName} via Nabd Plus! Link: ${url}`,`
- `167: // Real platform policies (aligned with the backend cancellation policy)`
- `178: <TouchableOpacity style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: resolveColor('var(--p)'), borderRadius: 12 }} onPress={() => router.back()}>`
- `221: <TouchableOpacity activeOpacity={0.8} onPress={() => setIsImgModalVisible(true)}>`
- `239: <TouchableOpacity onPress={() => doc?.facility_id && router.push(`/consultations/clinic/${doc.facility_id}`)} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 14, backgroundColor: 'rgba(255,255,255,`
### backend_consumers_or_contracts
- `51: const data = await apiFetch(`/care/doctors/${encodeURIComponent(id || 'd1')}`);`
- `149: const res = await apiFetch(`/care/doctors/${encodeURIComponent(doc.id)}/slots?date=${iso}&service_type=${vt}`);`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState } from 'react';`
- `45: const [doc, setDoc] = useState<any>({});`
- `46: const [loading, setLoading] = useState(true);`
- `62: console.log('Error fetching doctor details:', err);`
- `64: setLoading(false);`
- `103: const [activeVt, setActiveVt] = useState(visit_type || 'clinic');`
- `104: const [day, setDay] = useState(0);`
- `105: const [faqExpanded, setFaqExpanded] = useState({});`
- `106: const [isFav, setIsFav] = useState(false);`
- `107: const [isImgModalVisible, setIsImgModalVisible] = useState(false);`
- `118: } catch (error) {`
- `119: console.log(error);`
### payment_insurance_relevance
- `125: // Real per-mode prices from the provider profile — no invented multipliers`
- `126: const getPrice = (type) => {`
- `128: const p = vt === 'clinic' ? doc?.price_clinic : vt === 'video' ? doc?.price_online : doc?.price_home;`
- `256: <LocalizedText style={{ fontSize: 36, fontWeight: '900', color: resolveColor('var(--n)'), letterSpacing: -2 }}>{getPrice(activeVt) ?? '—'}</LocalizedText>`
- `310: { id: 'clinic', n: 'عيادة', ic: 'meeting_room', p: getPrice('clinic'), c: 'var(--n)', bg: 'var(--n)', tc: '#fff' },`
- `311: { id: 'video', n: 'أونلاين', ic: 'videocam', p: getPrice('video'), c: 'var(--p)', bg: 'var(--s)', tc: 'var(--t)' },`
- `312: { id: 'home', n: 'منزلي', ic: 'home', p: getPrice('home'), c: 'var(--p)', bg: 'var(--s)', tc: 'var(--t)' }`
- `338: <TouchableOpacity key={i} onPress={() => setDay(i)} style={[styles.dayCard, { backgroundColor: isActive ? colors.n : colors.s, borderColor: isActive ? undefined : colors.bd, marginRight: 7, transform: [{ scaleX: isRTL ? -1 : 1 }] }]}>`
- `464: doc.accepts_insurance ? { ic: 'health_and_safety', c: 'var(--am)', cs: 'var(--as)', t: 'التأمين', d: 'يقبل التأمين الطبي' } : null,`
- `528: const price = getPrice(activeVt);`
- `541: ? `تأكيد الحجز${getPrice(activeVt) != null ? ` — ${getPrice(activeVt)} ر.س` : ''}``
- `563: dayCard: { width: 56, paddingVertical: 8, borderRadius: 14, alignItems: 'center', borderWidth: 1.5 },`
### error_empty_loading_retry_cancel
- `46: const [loading, setLoading] = useState(true);`
- `61: } catch (err) {`
- `62: console.log('Error fetching doctor details:', err);`
- `64: setLoading(false);`
- `118: } catch (error) {`
- `119: console.log(error);`
- `135: const [loadingSlots, setLoadingSlots] = useState(false);`
- `142: setLoadingSlots(true);`
- `153: } catch {`
- `156: setSlotsReason('error');`
- `158: if (active) setLoadingSlots(false);`
- `167: // Real platform policies (aligned with the backend cancellation policy)`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
