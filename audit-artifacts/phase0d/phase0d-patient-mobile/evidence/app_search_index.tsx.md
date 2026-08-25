# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/search/index.tsx`
- **Member SHA-256:** `80389867a6260b6c5fff35bcf2c54e35373050af11d3cb850f74f1ed63af8935`
- **Line count:** 235
- **Read range:** `1-235`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { router } from 'expo-router';`
- `84: router.push(`/consultations/doctor/${id}` as any);`
- `86: router.push('/(tabs)/health' as any);`
- `88: // M1-33: fixed broken route — the screen is product-detail, not product/[id]`
- `89: router.push({ pathname: '/pharmacy/product-detail', params: { id } } as any);`
- `91: router.push({ pathname: '/diagnostics/test-detail', params: { id } } as any);`
- `93: router.push({ pathname: '/diagnostics/test-detail', params: { id, type: 'radiology' } } as any);`
- `95: router.push(`/articles/${r.slug || id}` as any);`
- `97: router.push('/insurance/hub' as any);`
- `99: router.push({ pathname: '/community/post-detail', params: { id } } as any);`
- `101: router.push({ pathname: '/family/member-health', params: { id } } as any);`
- `127: onPress={() => setSearchCat(i)}`
### backend_consumers_or_contracts
- `54: apiFetch(`/home/search?q=${encodeURIComponent(query)}`)`
- `89: router.push({ pathname: '/pharmacy/product-detail', params: { id } } as any);`
- `97: router.push('/insurance/hub' as any);`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useState } from 'react';`
- `26: const [searchCat, setSearchCat] = useState(0); // index 0 for 'All'`
- `27: const [query, setQuery] = useState('');`
- `28: const [searchData, setSearchData] = useState<any[]>([]);`
- `29: const [recent, setRecent] = useState<string[]>([]);`
- `59: .catch(console.error);`
### payment_insurance_relevance
- `15: const catsEn = ['All', 'Doctors', 'Pharmacy', 'Labs', 'Radiology', 'Articles', 'Diseases', 'Insurance', 'Community', 'Family'];`
- `18: const catMapEn = { 'Doctors': 'Doctor', 'Pharmacy': 'Medicine', 'Labs': 'Lab', 'Radiology': 'Radiology', 'Articles': 'Article', 'Diseases': 'Disease', 'Insurance': 'Insurance', 'Community': 'Community', 'Family': 'Family' };`
- `97: router.push('/insurance/hub' as any);`
- `112: style={{ flex: 1, fontSize: 13, color: colors.n, textAlign: isRTL ? 'right' : 'left' }} placeholder={lang === 'ar' ? 'ابحث عن طبيب، دواء، تحليل، مقال، تأمين...' : 'Search doctor, medicine, lab, article, insurance...'}`
- `168: style={[styles.resultCard, {`
- `206: {r.price ? (`
- `208: <LocalizedText style={{ fontSize: 14, fontWeight: '900', color: colors.p }}>{lang === 'ar' ? r.price : r.priceEn}</LocalizedText>`
- `231: resultCard: { position: 'relative', alignItems: 'center', marginBottom: 12, borderWidth: 1.5, borderRadius: 16, padding: 12 },`
### error_empty_loading_retry_cancel
- `35: .catch(() => {});`
- `43: AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});`
- `53: const delayDebounceFn = setTimeout(() => {`
- `59: .catch(console.error);`
- `62: return () => clearTimeout(delayDebounceFn);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
