# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(auth)/register.tsx`
- **Member SHA-256:** `9dcfbb10245c004eb4d7260ac27c55d0b7880fcc8d96ac15d9bc4d1340da6a5d`
- **Line count:** 387
- **Read range:** `1-387`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router } from 'expo-router';`
- `45: <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 10 }}>`
- `55: export default function RegisterScreen() {`
- `113: const res = await apiFetch('/auth/social-login', {`
- `125: router.replace('/(auth)/provider-info' as any);`
- `127: router.replace('/(tabs)');`
- `136: const handleAppleLogin = async () => {`
- `148: if (e.code !== 'ERR_REQUEST_CANCELED') {`
- `165: const handleRegister = async () => {`
- `171: body: JSON.stringify({ email: form.email.trim().toLowerCase(), purpose: 'register' }),`
- `182: router.push({`
- `186: mode: 'register',`
### backend_consumers_or_contracts
- `16: import { createRegistrationTransaction } from '../../src/services/auth/RegistrationTransaction';`
- `86: { authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize', tokenEndpoint: 'https://api.twitter.com/2/oauth2/token' }`
- `92: scopes: ['https://auth.snapchat.com/oauth2/api/user.display_name'],`
- `95: { authorizationEndpoint: 'https://accounts.snapchat.com/accounts/oauth2/auth', tokenEndpoint: 'https://accounts.snapchat.com/accounts/oauth2/token' }`
- `113: const res = await apiFetch('/auth/social-login', {`
- `169: await apiFetch('/auth/send-otp', {`
### auth_ownership
- `19: import * as Google from 'expo-auth-session/providers/google';`
- `21: import * as AuthSession from 'expo-auth-session';`
- `24: WebBrowser.maybeCompleteAuthSession();`
- `75: if (response?.type === 'success' && response.authentication?.accessToken) {`
- `76: handleOAuthBackend('google', response.authentication.accessToken);`
- `80: const [reqX, resX, promptAsyncX] = AuthSession.useAuthRequest(`
- `84: redirectUri: AuthSession.makeRedirectUri({ scheme: 'nabdplus' }),`
- `86: { authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize', tokenEndpoint: 'https://api.twitter.com/2/oauth2/token' }`
- `89: const [reqSnap, resSnap, promptAsyncSnap] = AuthSession.useAuthRequest(`
- `93: redirectUri: AuthSession.makeRedirectUri({ scheme: 'nabdplus' }),`
- `95: { authorizationEndpoint: 'https://accounts.snapchat.com/accounts/oauth2/auth', tokenEndpoint: 'https://accounts.snapchat.com/accounts/oauth2/token' }`
- `99: if (resX?.type === 'success' && resX.authentication?.accessToken) {`
### state_transitions
- `2: import React, { useState } from 'react';`
- `61: const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirmPw: '' });`
- `62: const [showPassword, setShowPassword] = useState(false);`
- `63: const [focusedInput, setFocusedInput] = useState<string | null>(null);`
- `64: const [loading, setLoading] = useState(false);`
- `65: const [agreed, setAgreed] = useState(false);`
- `66: const [errorMessage, setErrorMessage] = useState<string | null>(null);`
- `75: if (response?.type === 'success' && response.authentication?.accessToken) {`
- `99: if (resX?.type === 'success' && resX.authentication?.accessToken) {`
- `105: if (resSnap?.type === 'success' && resSnap.authentication?.accessToken) {`
- `112: setLoading(true);`
- `119: if (!jwtToken) throw new Error('لم يستلم التطبيق جلسة صالحة من الخادم');`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `64: const [loading, setLoading] = useState(false);`
- `66: const [errorMessage, setErrorMessage] = useState<string | null>(null);`
- `83: scopes: ['tweet.read', 'users.read', 'offline.access'],`
- `112: setLoading(true);`
- `119: if (!jwtToken) throw new Error('لم يستلم التطبيق جلسة صالحة من الخادم');`
- `121: catch (_err) { await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, jwtToken); }`
- `129: } catch (err: any) {`
- `130: setErrorMessage(err.message || `فشل التسجيل بواسطة ${provider}`);`
- `132: setLoading(false);`
- `147: } catch (e: any) {`
- `148: if (e.code !== 'ERR_REQUEST_CANCELED') {`
- `149: setErrorMessage('فشل التسجيل عبر آبل');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
