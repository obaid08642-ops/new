# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(tabs)/nursing.tsx`
- **Member SHA-256:** `3329c1a3e27bc3e55a74c7412b95ffa03e8f0a7ce28216a57734f259fa8de113`
- **Line count:** 322
- **Read range:** `1-322`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { useRouter } from 'expo-router';`
- `29: const router = useRouter();`
- `91: router.push({`
- `99: router.push({`
- `113: <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setFilterVisible(true)}>`
- `131: <TouchableOpacity activeOpacity={0.8} style={styles.toggleBtnWrap} onPress={() => setPaymentFlow('insurance')}>`
- `139: <TouchableOpacity activeOpacity={0.8} style={styles.toggleBtnWrap} onPress={() => setPaymentFlow('cash')}>`
- `156: <TouchableOpacity key={pkg.id} activeOpacity={0.9} onPress={() => navToService(pkg.id, pickLocalized(pkg.name_ar, pkg.title))}>`
- `192: onPress={() => navToServiceInfo(svc.id)}`
- `208: style={styles.quickBookBtn}`
- `210: onPress={() => navToService(svc.id, svc.title)}`
- `212: <LocalizedText style={styles.quickBookText}>احجز الآن</LocalizedText>`
### backend_consumers_or_contracts
- `45: apiFetch('/home-care/services')`
- `52: apiFetch('/home-care/packages').then((r: any) => setDbPackages(Array.isArray(r) ? r : (r?.data || []))).catch(console.error);`
- `92: pathname: '/nursing/service-details',`
- `100: pathname: '/nursing/service-info',`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState, useEffect } from 'react';`
- `32: const [paymentFlow, setPaymentFlow] = useState<'insurance'|'cash'>('cash');`
- `33: const [search, setSearch] = useState('');`
- `34: const [filterVisible, setFilterVisible] = useState(false);`
- `36: // Filter States`
- `37: const [gender, setGender] = useState('any');`
- `38: const [availability, setAvailability] = useState('any');`
- `39: const [nationality, setNationality] = useState('any');`
- `41: const [dbServices, setDbServices] = useState<any[]>([]);`
- `42: const [dbPackages, setDbPackages] = useState<any[]>([]);`
- `51: .catch(console.error);`
- `52: apiFetch('/home-care/packages').then((r: any) => setDbPackages(Array.isArray(r) ? r : (r?.data || []))).catch(console.error);`
### payment_insurance_relevance
- `20: Insurance: ({ active }: { active: boolean }) => <Svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "#3b82f6"} strokeWidth="2"><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Svg>,`
- `21: Cash: ({ active }: { active: boolean }) => <Svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "#10B981"} strokeWidth="2"><Rect x="2" y="6" width="20" height="12" rx="3"/><Circle cx="12" cy="12" r="2"/></Sv`
- `32: const [paymentFlow, setPaymentFlow] = useState<'insurance'|'cash'>('cash');`
- `93: params: { serviceId: id, title, flow: paymentFlow, gender, availability, nationality, search }`
- `97: // Card tap → service PROFILE (image + full description + احجز الآن)`
- `101: params: { serviceId: id, flow: paymentFlow, gender, availability, nationality, search }`
- `129: {/* PAYMENT TOGGLES */}`
- `131: <TouchableOpacity activeOpacity={0.8} style={styles.toggleBtnWrap} onPress={() => setPaymentFlow('insurance')}>`
- `133: style={[styles.toggleBtn, paymentFlow === 'insurance' && styles.toggleActiveBlue, { borderColor: colors.surface } ]}>`
- `134: <Icons.Insurance active={paymentFlow === 'insurance'} />`
- `135: <LocalizedText style={[styles.toggleText, paymentFlow === 'insurance' && styles.toggleTextActive]} >تأمين طبي</LocalizedText>`
- `139: <TouchableOpacity activeOpacity={0.8} style={styles.toggleBtnWrap} onPress={() => setPaymentFlow('cash')}>`
### error_empty_loading_retry_cancel
- `51: .catch(console.error);`
- `52: apiFetch('/home-care/packages').then((r: any) => setDbPackages(Array.isArray(r) ? r : (r?.data || []))).catch(console.error);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
