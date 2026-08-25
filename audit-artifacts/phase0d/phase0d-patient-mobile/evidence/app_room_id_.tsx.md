# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/room/[id].tsx`
- **Member SHA-256:** `fd8546f51586a25fe7be54e6ec20c14eac36a8de36d868929c3e5728759caf44`
- **Line count:** 295
- **Read range:** `1-295`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { useLocalSearchParams, router, Stack } from 'expo-router';`
- `6: // import crashes module evaluation so the default export never registers`
- `31: // crashed module evaluation (TypeError: colors of undefined) and the route`
- `79: {/* Remote Participant Video (Full Screen) */}`
- `114: onPress={toggleMic}`
- `125: onPress={onEndCall}`
- `132: onPress={toggleCamera}`
- `145: export default function RoomScreen() {`
- `172: router.back();`
- `181: <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>`
- `199: <Stack.Screen options={{ headerShown: false }} />`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `30: // Local token shim — the DS barrel doesn't export a DSTokens object; using it`
- `33: const DSTokens = {`
- `88: <ActivityIndicator size="large" color={DSTokens.colors.primary.main} />`
- `89: <DSText variant="body" color={DSTokens.colors.text.secondary} style={{ marginTop: 12 }}>`
- `105: <MaterialCommunityIcons name="video-off" size={32} color={DSTokens.colors.base.white} />`
- `119: color={DSTokens.colors.base.white}`
- `127: <MaterialCommunityIcons name="phone-hangup" size={32} color={DSTokens.colors.base.white} />`
- `137: color={DSTokens.colors.base.white}`
- `147: const [token, setToken] = useState<string | null>(null);`
- `156: // Fetch LiveKit token from backend`
- `157: const fetchToken = async () => {`
- `160: const response = await HttpClient.post<{ token: string }>(`/calls/${id}/join`, {});`
### state_transitions
- `2: import React, { useEffect, useState } from 'react';`
- `31: // crashed module evaluation (TypeError: colors of undefined) and the route`
- `36: error: { main: '#EF4444' },`
- `62: const [isMuted, setIsMuted] = useState(false);`
- `63: const [isCameraOff, setIsCameraOff] = useState(false);`
- `147: const [token, setToken] = useState<string | null>(null);`
- `148: const [error, setError] = useState<string | null>(null);`
- `149: const user = useAppSelector(state => state.auth.user);`
- `153: setError('مكالمات الفيديو تتطلب نسخة التطبيق الكاملة (Development Build) ولا تعمل داخل Expo Go.');`
- `159: if (!user) throw new Error('User not authenticated');`
- `163: console.error('Failed to get token', err);`
- `164: setError('تعذر الانضمام للغرفة. يرجى التأكد من الموعد.');`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `24: } catch {`
- `31: // crashed module evaluation (TypeError: colors of undefined) and the route`
- `36: error: { main: '#EF4444' },`
- `148: const [error, setError] = useState<string | null>(null);`
- `153: setError('مكالمات الفيديو تتطلب نسخة التطبيق الكاملة (Development Build) ولا تعمل داخل Expo Go.');`
- `159: if (!user) throw new Error('User not authenticated');`
- `162: } catch (err) {`
- `163: console.error('Failed to get token', err);`
- `164: setError('تعذر الانضمام للغرفة. يرجى التأكد من الموعد.');`
- `175: if (error) {`
- `178: <MaterialCommunityIcons name="alert-circle" size={48} color={DSTokens.colors.error.main} />`
- `180: <DSText variant="body" color={DSTokens.colors.text.secondary}>{error}</DSText>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
