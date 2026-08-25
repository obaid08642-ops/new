# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(auth)/otp.tsx`
- **Member SHA-256:** `dd67a6b8a51d1686b8ca58dd5496901634a281e3f3888c3c3d529549405f42fb`
- **Line count:** 264
- **Read range:** `1-264`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router, useLocalSearchParams } from 'expo-router';`
- `15: import { loginSuccess } from '../../src/store/slices/authSlice';`
- `20: export default function OtpScreen() {`
- `26: const mode = (params.mode as string) || 'login';`
- `27: const [registrationPayload] = useState(() => mode === 'register'`
- `89: router.replace({ pathname: '/(auth)/reset-password', params: { email: emailParam } });`
- `93: if (mode === 'register') {`
- `99: const regRes = await apiFetch('/auth/register', {`
- `134: dispatch(loginSuccess({ user: userData as any, token }));`
- `139: router.replace('/(auth)/provider-info' as any);`
- `141: router.replace('/(tabs)');`
- `155: <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: resolveColor('var(--s)', isDark), borderColor: resolveColor('var(--bd)', isDark) } ]}>`
### backend_consumers_or_contracts
- `15: import { loginSuccess } from '../../src/store/slices/authSlice';`
- `18: import { consumeRegistrationTransaction } from '../../src/services/auth/RegistrationTransaction';`
- `74: const resOtp = await apiFetch('/auth/verify-otp', {`
- `82: // M1: backend returns { ok: true } from /auth/verify-otp (older mocks used `verified`)`
- `99: const regRes = await apiFetch('/auth/register', {`
### auth_ownership
- `15: import { loginSuccess } from '../../src/store/slices/authSlice';`
- `20: export default function OtpScreen() {`
- `26: const mode = (params.mode as string) || 'login';`
- `34: const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6 digits for our backend`
- `48: const newOtp = [...otp];`
- `49: newOtp[index] = text;`
- `50: setOtp(newOtp);`
- `58: if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {`
- `64: const code = otp.join('');`
- `74: const resOtp = await apiFetch('/auth/verify-otp', {`
- `82: // M1: backend returns { ok: true } from /auth/verify-otp (older mocks used `verified`)`
- `83: const otpVerified = !!(resOtp?.verified || resOtp?.ok);`
### state_transitions
- `2: import React, { useState, useEffect, useRef } from 'react';`
- `15: import { loginSuccess } from '../../src/store/slices/authSlice';`
- `23: const isGuest = useSelector((state: any) => state.auth.isGuest);`
- `27: const [registrationPayload] = useState(() => mode === 'register'`
- `34: const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6 digits for our backend`
- `35: const [focusedIndex, setFocusedIndex] = useState<number | null>(null);`
- `36: const [loading, setLoading] = useState(false);`
- `37: const [timer, setTimer] = useState(60);`
- `70: setLoading(true);`
- `90: setLoading(false);`
- `96: setLoading(false);`
- `112: setLoading(false);`
### payment_insurance_relevance
- `27: const [registrationPayload] = useState(() => mode === 'register'`
- `30: const phone = registrationPayload?.phone || (params.phone as string) || '';`
- `72: const emailParam = registrationPayload?.email || (params.email as string) || '';`
- `94: if (!registrationPayload) {`
- `102: full_name: registrationPayload.fullName,`
- `103: phone: registrationPayload.phone,`
- `104: email: registrationPayload.email,`
- `105: password: registrationPayload.password,`
### error_empty_loading_retry_cancel
- `36: const [loading, setLoading] = useState(false);`
- `42: const t = setTimeout(() => setTimer(timer - 1), 1000);`
- `43: return () => clearTimeout(t);`
- `70: setLoading(true);`
- `90: setLoading(false);`
- `96: setLoading(false);`
- `112: setLoading(false);`
- `119: setLoading(false);`
- `127: } catch {`
- `129: setLoading(false);`
- `143: } catch (err: any) {`
- `146: setLoading(false);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
