# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/insurance/hub.tsx`
- **Member SHA-256:** `53f8e884394bdf0308e180e4d245b9564e48d84367ec4c627a1d069a6e659a70`
- **Line count:** 517
- **Read range:** `1-517`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { router } from 'expo-router';`
- `22: const CHI_URL = 'https://www.chi.gov.sa/ar/Services/Pages/BeneficiaryInquiry.aspx';`
- `75: { icon: 'search', label: 'فحص التغطية', color: '#23B5CE', bg: '#EBF3FF', route: '/insurance/coverage-check' },`
- `76: { icon: 'document', label: 'رفع مطالبة', color: '#7A6BEA', bg: '#EDE9FE', route: '/insurance/submit-claim' },`
- `77: { icon: 'hospital', label: 'مزودو الخدمة', color: '#5BA84F', bg: '#DCFCE7', route: '/insurance/network-providers' },`
- `78: { icon: 'wallet', label: 'المزايا المتبقية', color: '#F0A526', bg: '#FEF3C7', route: '/insurance/benefits-summary' },`
- `81: export default function InsuranceHubScreen() {`
- `205: <IconButton icon="add" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/insurance/add-policy')} />`
- `207: <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />`
- `270: onPress={() => { setChiVisible(true); setChiLoading(true); setChiScraped(false); }} style={styles.chiBtn}`
- `284: onPress={() => router.push(a.route as any)}`
- `297: <TouchableOpacity onPress={() => router.push('/insurance/benefits-summary')}>`
### backend_consumers_or_contracts
- `2: // app/insurance/hub.tsx — CHI WebView DOM Scraper + Full Backend Integration`
- `75: { icon: 'search', label: 'فحص التغطية', color: '#23B5CE', bg: '#EBF3FF', route: '/insurance/coverage-check' },`
- `76: { icon: 'document', label: 'رفع مطالبة', color: '#7A6BEA', bg: '#EDE9FE', route: '/insurance/submit-claim' },`
- `77: { icon: 'hospital', label: 'مزودو الخدمة', color: '#5BA84F', bg: '#DCFCE7', route: '/insurance/network-providers' },`
- `78: { icon: 'wallet', label: 'المزايا المتبقية', color: '#F0A526', bg: '#FEF3C7', route: '/insurance/benefits-summary' },`
- `95: const ins = await apiFetch('/users/me/insurance');`
- `122: const res = await apiFetch('/insurance/claims');`
- `161: const saved = await apiFetch('/insurance/save-policy', {`
- `205: <IconButton icon="add" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/insurance/add-policy')} />`
- `297: <TouchableOpacity onPress={() => router.push('/insurance/benefits-summary')}>`
- `329: <TouchableOpacity onPress={() => router.push('/insurance/policy-detail' as any)}>`
- `354: <TouchableOpacity onPress={() => router.push('/insurance/add-policy')}>`
### auth_ownership
- `182: // Refresh policies list`
### state_transitions
- `3: import React, { useState, useRef, useCallback, useEffect } from 'react';`
- `6: Dimensions, StatusBar, Modal, Alert, ActivityIndicator, TextInput,`
- `34: window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'timeout' }));`
- `57: window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'success', data: extracted }));`
- `61: // Also check for error messages`
- `62: var errEl = document.querySelector('.error-message, .no-result, [class*="error"]');`
- `65: window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'error', message: errEl.innerText.trim() }));`
- `88: const [policies, setPolicies] = useState<any[]>([]);`
- `89: const [claims, setClaims] = useState<any[]>([]);`
- `90: const [loadingPolicies, setLoadingPolicies] = useState(true);`
- `115: console.error(err);`
- `117: setLoadingPolicies(false);`
### payment_insurance_relevance
- `2: // app/insurance/hub.tsx — CHI WebView DOM Scraper + Full Backend Integration`
- `15: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `75: { icon: 'search', label: 'فحص التغطية', color: '#23B5CE', bg: '#EBF3FF', route: '/insurance/coverage-check' },`
- `76: { icon: 'document', label: 'رفع مطالبة', color: '#7A6BEA', bg: '#EDE9FE', route: '/insurance/submit-claim' },`
- `77: { icon: 'hospital', label: 'مزودو الخدمة', color: '#5BA84F', bg: '#DCFCE7', route: '/insurance/network-providers' },`
- `78: { icon: 'wallet', label: 'المزايا المتبقية', color: '#F0A526', bg: '#FEF3C7', route: '/insurance/benefits-summary' },`
- `81: export default function InsuranceHubScreen() {`
- `85: // Insurance is one of the ONLY two guest-restricted areas (with family).`
- `86: if (isGuest) { requireAuth('insurance'); return null; }`
- `93: async function loadInsurance() {`
- `95: const ins = await apiFetch('/users/me/insurance');`
- `108: coverage: { consultations: 90, medicines: 80, diagnostics: 85, nursing: 70, hospitalization: 95, dental: 50, optical: 60 },`
### error_empty_loading_retry_cancel
- `28: var maxTries = 60; // 60 x 800ms = 48s timeout`
- `34: window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'timeout' }));`
- `61: // Also check for error messages`
- `62: var errEl = document.querySelector('.error-message, .no-result, [class*="error"]');`
- `65: window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'error', message: errEl.innerText.trim() }));`
- `90: const [loadingPolicies, setLoadingPolicies] = useState(true);`
- `114: } catch (err) {`
- `115: console.error(err);`
- `117: setLoadingPolicies(false);`
- `124: } catch (err) {`
- `125: console.error('Error fetching claims', err);`
- `137: const [chiLoading, setChiLoading] = useState(true);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
