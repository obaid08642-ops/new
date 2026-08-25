# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/pharmacy/filters.tsx`
- **Member SHA-256:** `8e40f1cbd8dab5ac2df8c2e541a7410639729b4c9ab01c86eab60d5b55419ff4`
- **Line count:** 381
- **Read range:** `1-381`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: import { router, useLocalSearchParams } from 'expo-router';`
- `38: // ── Global filter state (passed via router params on apply) ─────`
- `39: export default function PharmacyFiltersScreen() {`
- `109: router.replace({`
- `146: onPress={() => router.back()}`
- `160: <TouchableOpacity onPress={handleReset}>`
- `178: onPress={() => setActiveSort(opt.id)}`
- `201: onPress={() => setActiveCat(cat.id)}`
- `217: onPress={() => setRxOnly(!rxOnly)}`
- `278: onPress={() => toggleArr(activeForm, setActiveForm, f.id)}`
- `310: onPress={() => toggleArr(activeBrand, setActiveBrand, b)}`
- `326: <TouchableOpacity onPress={handleApply} activeOpacity={0.88} style={{ borderRadius: 20, overflow: 'hidden' }}>`
### backend_consumers_or_contracts
- `2: // app/pharmacy/filters.tsx — فلاتر الصيدلية المتقدمة (مربوطة بالـ Backend)`
- `64: const data = await apiFetch('/medicines/filters');`
- `110: pathname: '/(tabs)/pharmacy',`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useState } from 'react';`
- `38: // ── Global filter state (passed via router params on apply) ─────`
- `48: const [activeCat,   setActiveCat]   = useState(params.filter_category || 'all');`
- `49: const [activeForm,  setActiveForm]  = useState<string[]>(params.filter_forms ? params.filter_forms.split(',') : []);`
- `50: const [activeBrand, setActiveBrand] = useState<string[]>(params.filter_brands ? params.filter_brands.split(',') : []);`
- `51: const [rxOnly,      setRxOnly]      = useState(params.filter_rx === '1');`
- `52: const [activeSort,  setActiveSort]  = useState(params.filter_sort || 'relevant');`
- `53: const [brandSearch, setBrandSearch] = useState('');`
- `54: const [minPrice,    setMinPrice]    = useState(params.filter_min_price || '');`
- `55: const [maxPrice,    setMaxPrice]    = useState(params.filter_max_price || '');`
- `57: const [categoriesData, setCategoriesData] = useState<any[]>(FALLBACK_CATEGORIES);`
- `58: const [formsData, setFormsData] = useState<any[]>(FALLBACK_FORMS);`
### payment_insurance_relevance
- `33: { id: 'price_asc',label: 'السعر: من الأقل للأعلى', icon: 'trending_up' },`
- `34: { id: 'price_desc',label: 'السعر: من الأعلى للأقل', icon: 'trendingDown' },`
- `54: const [minPrice,    setMinPrice]    = useState(params.filter_min_price || '');`
- `55: const [maxPrice,    setMaxPrice]    = useState(params.filter_max_price || '');`
- `104: (minPrice || maxPrice) ? 1 : 0,`
- `116: filter_min_price: minPrice,`
- `117: filter_max_price: maxPrice,`
- `129: setMinPrice('');`
- `130: setMaxPrice('');`
- `243: {/* ── Price Range ── */}`
- `247: <View style={[st.priceInput, { backgroundColor: colors.s, borderColor: colors.bd } ]}>`
- `252: value={minPrice}`
### error_empty_loading_retry_cancel
- `90: } catch (err) {}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
