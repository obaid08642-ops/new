# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(auth)/login.tsx`
- **Member SHA-256:** `587c9b5ae250d20b0faadbb94c7562943b62604232f87918a58ab273ef320b5e`
- **Line count:** 415
- **Read range:** `1-415`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router } from 'expo-router';`
- `29: export default function LoginScreen() {`
- `91: const res = await apiFetch('/auth/social-login', {`
- `103: router.replace('/(auth)/provider-info' as any);`
- `105: router.replace('/(tabs)');`
- `114: const handleAppleLogin = async () => {`
- `126: if (e.code !== 'ERR_REQUEST_CANCELED') {`
- `132: const handleLogin = async () => {`
- `151: const res = await apiFetch('/auth/login', {`
- `177: router.replace('/(auth)/provider-info' as any);`
- `179: router.replace('/(tabs)');`
- `192: const handleSocialLogin = async (provider: string) => {`
### backend_consumers_or_contracts
- `64: { authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize', tokenEndpoint: 'https://api.twitter.com/2/oauth2/token' }`
- `70: scopes: ['https://auth.snapchat.com/oauth2/api/user.display_name'],`
- `73: { authorizationEndpoint: 'https://accounts.snapchat.com/accounts/oauth2/auth', tokenEndpoint: 'https://accounts.snapchat.com/accounts/oauth2/token' }`
- `91: const res = await apiFetch('/auth/social-login', {`
- `151: const res = await apiFetch('/auth/login', {`
### auth_ownership
- `14: import { apiFetch, storeAuthSession } from '../../src/utils/api';`
- `19: import * as Google from 'expo-auth-session/providers/google';`
- `21: import * as AuthSession from 'expo-auth-session';`
- `24: WebBrowser.maybeCompleteAuthSession();`
- `29: export default function LoginScreen() {`
- `53: if (response?.type === 'success' && response.authentication?.accessToken) {`
- `54: handleOAuthBackend('google', response.authentication.accessToken);`
- `58: const [reqX, resX, promptAsyncX] = AuthSession.useAuthRequest(`
- `62: redirectUri: AuthSession.makeRedirectUri({ scheme: 'nabdplus' }),`
- `64: { authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize', tokenEndpoint: 'https://api.twitter.com/2/oauth2/token' }`
- `67: const [reqSnap, resSnap, promptAsyncSnap] = AuthSession.useAuthRequest(`
- `71: redirectUri: AuthSession.makeRedirectUri({ scheme: 'nabdplus' }),`
### state_transitions
- `2: import React, { useState } from 'react';`
- `35: const [phone, setPhone] = useState('');`
- `36: const [password, setPassword] = useState('');`
- `37: const [showPassword, setShowPassword] = useState(false);`
- `38: const [focusedInput, setFocusedInput] = useState<string | null>(null);`
- `39: const [loading, setLoading] = useState(false);`
- `40: const [attempts, setAttempts] = useState(0);`
- `41: const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);`
- `42: const [errorMessage, setErrorMessage] = useState<string | null>(null);`
- `53: if (response?.type === 'success' && response.authentication?.accessToken) {`
- `77: if (resX?.type === 'success' && resX.authentication?.accessToken) {`
- `83: if (resSnap?.type === 'success' && resSnap.authentication?.accessToken) {`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `39: const [loading, setLoading] = useState(false);`
- `42: const [errorMessage, setErrorMessage] = useState<string | null>(null);`
- `61: scopes: ['tweet.read', 'users.read', 'offline.access'],`
- `90: setLoading(true);`
- `95: // M1: no more dummy token fallback — a real session or an explicit error`
- `97: if (!jwtToken) throw new Error('لم يستلم التطبيق جلسة صالحة من الخادم');`
- `99: catch (_err) { await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, jwtToken); }`
- `107: } catch (err: any) {`
- `108: setErrorMessage(err.message || `فشل تسجيل الدخول بواسطة ${provider}`);`
- `110: setLoading(false);`
- `125: } catch (e: any) {`
- `126: if (e.code !== 'ERR_REQUEST_CANCELED') {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
