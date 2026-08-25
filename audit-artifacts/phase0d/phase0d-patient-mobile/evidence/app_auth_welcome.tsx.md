# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(auth)/welcome.tsx`
- **Member SHA-256:** `6fd387fc013f5cea23ac402e6f000a1073887f8507d23754a43c06ec5d420179`
- **Line count:** 238
- **Read range:** `1-238`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: import { router } from 'expo-router';`
- `19: const login = () => {};`
- `20: const go = (screen: string) => {`
- `21: if (screen === 'sH') router.push('/(tabs)');`
- `22: else if (screen === 's86') router.push('/(auth)/register');`
- `23: else if (screen === 's85') router.push('/(auth)/login');`
- `77: onPress={toggleDark}`
- `85: onPress={() => setLangModalVisible(true)}`
- `95: <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setLangModalVisible(false)}>`
- `100: style={{ paddingVertical: 12, paddingHorizontal: 16, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 8, backgroundColor: lang === l.code ? colors.bg : 'transparent' }} onPre`
- `125: onPress={() => go('s86')}`
- `128: <LocalizedText style={styles.primaryBtnText}>{lang === 'ar' ? 'تسجيل' : 'Register'}</LocalizedText>`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `19: const login = () => {};`
- `23: else if (screen === 's85') router.push('/(auth)/login');`
- `150: <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={[styles.modernSocialBtn, { backgroundColor: isDark ? '#1A2540' : '#FFFFFF' }]} activeOpacity={0.8}>`
- `156: <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={[styles.modernSocialBtn, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]} activeOpacity={0.8}>`
- `162: <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={[styles.modernSocialBtn, { backgroundColor: '#FFFC00' }]} activeOpacity={0.8}>`
- `167: <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={[styles.modernSocialBtn, { backgroundColor: isDark ? '#1A2540' : '#FFFFFF' }]} activeOpacity={0.8}>`
### state_transitions
- `2: import React, { useRef, useEffect, useState } from 'react';`
- `26: const [langModalVisible, setLangModalVisible] = useState(false);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
