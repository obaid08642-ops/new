# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(tabs)/consultations/index.tsx`
- **Member SHA-256:** `51b28ba195cde72b00245dadc37e7409a83b4ed147181c8cd39c5af71e0fbc19`
- **Line count:** 695
- **Read range:** `1-695`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: import { router } from 'expo-router';`
- `31: const go = (screen: string, title?: string, params?: any) => {`
- `32: if (screen === 's11' || screen === 's5') {`
- `33: router.push(`/consultations/doctor/${params?.doc?.id || params?.id || 'd1'}`);`
- `34: } else if (screen === 's47') {`
- `35: router.push('/ai-assistant');`
- `220: onPress={() => setShowFilter(true)}`
- `231: <TouchableOpacity key={vt.id} activeOpacity={0.8} style={[styles.vtBtn, { backgroundColor: isActive ? resolveColor('var(--p)') : colors.s, borderColor: isActive ? resolveColor('var(--p)') : colors.bd }]} onPress={() => setActiveVt(vt.id)}>`
- `241: <TouchableOpacity style={[styles.segmentBtn, activePay === 'الكل' && { backgroundColor: resolveColor('var(--n)') }]} onPress={() => setActivePay('الكل')}>`
- `244: <TouchableOpacity style={[styles.segmentBtn, activePay === 'كاش' && { backgroundColor: resolveColor('var(--n)') }]} onPress={() => setActivePay('كاش')}>`
- `247: <TouchableOpacity style={[styles.segmentBtn, activePay === 'تأمين' && { backgroundColor: resolveColor('var(--n)') }]} onPress={() => { setActivePay('تأمين'); setStepIns(1); setShowInsModal(true); }}>`
- `257: <TouchableOpacity onPress={() => router.push('/consultations/specialty-select')}><LocalizedText style={{ fontSize: 12, fontWeight: '700', color: resolveColor('var(--pd)') }}>عرض الكل</LocalizedText></TouchableOpacity>`
### backend_consumers_or_contracts
- `66: const data = await apiFetch('/providers?type=doctor');`
- `93: apiFetch('/care/specialties')`
- `99: apiFetch('/home/offers')`
- `105: apiFetch('/insurance/companies')`
- `116: apiFetch(`/insurance/companies/${insCompany}/networks`)`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState } from 'react';`
- `40: const [activePay, setActivePay] = useState('الكل');`
- `41: const [activeVt, setActiveVt] = useState('clinic');`
- `42: const [activeSpec, setActiveSpec] = useState('الكل');`
- `43: const [doctors, setDoctors] = useState([]);`
- `44: const [loading, setLoading] = useState(true);`
- `45: const [specialties, setSpecialties] = useState<any[]>([]);`
- `46: const [offers, setOffers] = useState<any[]>([]);`
- `47: const [searchQuery, setSearchQuery] = useState('');`
- `48: const [showFilter, setShowFilter] = useState(false);`
- `49: const [filterTitle, setFilterTitle] = useState('الكل');`
- `50: const [filterGender, setFilterGender] = useState('الكل');`
### payment_insurance_relevance
- `40: const [activePay, setActivePay] = useState('الكل');`
- `46: const [offers, setOffers] = useState<any[]>([]);`
- `51: const [filterPrice, setFilterPrice] = useState('الكل');`
- `58: const [insuranceCompanies, setInsuranceCompanies] = useState<any[]>([]);`
- `59: const [insuranceNetworks, setInsuranceNetworks] = useState<any[]>([]);`
- `60: const [insuranceCatalogUnavailable, setInsuranceCatalogUnavailable] = useState(false);`
- `67: // Normalize real provider-profile fields into the card display shape`
- `80: p: (typeof d.price_clinic === 'number' ? d.price_clinic : null) ?? d.price_online ?? d.price_home ?? null,`
- `92: // Real specialties (names + live doctor counts) and real active offers`
- `99: apiFetch('/home/offers')`
- `102: setOffers(Array.isArray(list) ? list : []);`
- `104: .catch(() => setOffers([]));`
### error_empty_loading_retry_cancel
- `44: const [loading, setLoading] = useState(true);`
- `83: } catch (err) {`
- `84: console.log('Error fetching doctors:', err);`
- `87: setLoading(false);`
- `98: .catch(() => setSpecialties([]));`
- `104: .catch(() => setOffers([]));`
- `111: .catch(() => { setInsuranceCompanies([]); setInsuranceCatalogUnavailable(true); });`
- `118: .catch(() => setInsuranceNetworks([]));`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
